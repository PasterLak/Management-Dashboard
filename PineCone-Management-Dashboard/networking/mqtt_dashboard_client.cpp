#include "mqtt_dashboard_client.hpp"

#include "include/config.hpp"

extern "C" {
#include <cJSON.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <FreeRTOS.h>
#include <task.h>
}

MqttDashboardClient::MqttDashboardClient(const char* user, const char* password,
                                         const char* pub_topic,
                                         const char* sub_topic)
    : mqtt(user, password, sub_topic),
      debug_enabled(false),
  publish_topic(pub_topic),
  response_topic(sub_topic) {}

void MqttDashboardClient::setDebugEnabled(bool enabled) {
  debug_enabled = enabled;
}

void MqttDashboardClient::resetSessionState() {
  awaiting_response = false;
  last_publish_tick_ms = 0;
  publish_retry_delay_ms = Config::MQTT::PUBLISH_RETRY_DELAY_MS;
  response_timeout_count = 0;
}

bool MqttDashboardClient::sync(const char* server_ip, uint16_t port,
                               const DeviceSyncState& state,
                               ServerCommand& response) {
  (void)port;

  response.has_response = false;
  response.status_ok = false;
  response.new_node_id[0] = '\0';
  response.new_description[0] = '\0';
  response.should_blink = false;
  response.force_full_sync = false;

  if (!mqtt.isConnected()) {
    awaiting_response = false;
    last_publish_tick_ms = 0;
    publish_retry_delay_ms = Config::MQTT::PUBLISH_RETRY_DELAY_MS;
    response_timeout_count = 0;
    if (!isConnecting) {
      printf("Starting MQTT connection...\n");
      mqtt.connectToIP(server_ip);
      isConnecting = true;
    }
    return false;
  }

  isConnecting = false;

  if (!mqtt.isReady()) {
    return false;
  }

  if (mqtt.hasNewMessage()) {
    const char* msg = mqtt.getNextMessage();
    if (msg != nullptr && strlen(msg) > 0) {
      response.has_response = true;
      awaiting_response = false;
      response_timeout_count = 0;
      publish_retry_delay_ms = Config::MQTT::PUBLISH_RETRY_DELAY_MS;
      parseServerResponse(msg, response);
      if (response.new_node_id[0] != '\0') {
        updateResponseTopicForNodeId(response.new_node_id);
      }
      return response.status_ok;
    }
  }

  uint32_t now_ms = xTaskGetTickCount() * portTICK_PERIOD_MS;
  bool has_state_update = state.send_full_sync || state.send_desc || state.send_pins;

  if (awaiting_response) {
    if (mqtt.isPublishInFlight()) {
      if ((now_ms - last_publish_tick_ms) < Config::MQTT::PUBLISH_STALL_TIMEOUT_MS) {
        return true;
      }

      printf("[mqtt_sync] Publish stalled after %lu ms. Reconnecting.\r\n",
             static_cast<unsigned long>(now_ms - last_publish_tick_ms));
      mqtt.disconnect();
            isConnecting = false;
      resetSessionState();
      publish_retry_delay_ms = Config::MQTT::ERR_MEM_RETRY_DELAY_MS;
      return false;
    }

    if ((now_ms - last_publish_tick_ms) < Config::MQTT::RESPONSE_TIMEOUT_MS) {
      return true;
    }

    printf("[mqtt_sync] Response timeout after %lu ms. Allowing retry.\r\n",
           static_cast<unsigned long>(now_ms - last_publish_tick_ms));
    awaiting_response = false;
    response_timeout_count++;

    if (response_timeout_count >= Config::MQTT::MAX_RESPONSE_TIMEOUTS_BEFORE_RECONNECT) {
      printf("[mqtt_sync] Too many response timeouts. Reconnecting MQTT.\r\n");
      mqtt.disconnect();
      isConnecting = false;
      resetSessionState();
      publish_retry_delay_ms = Config::MQTT::ERR_MEM_RETRY_DELAY_MS;
      return false;
    }
  }

  if (!has_state_update && (now_ms - last_publish_tick_ms) < Config::MQTT::IDLE_POLL_INTERVAL_MS) {
    return true;
  }

  if ((now_ms - last_publish_tick_ms) < publish_retry_delay_ms) {
    return true;
  }

  cJSON* root = cJSON_CreateObject();
  if (root) {
    if (state.node_id != nullptr) {
      cJSON_AddStringToObject(root, "id", state.node_id);
    }

    if (state.send_full_sync) {
      cJSON_AddTrueToObject(root, "f");
    }

    if (state.send_desc && state.description != nullptr) {
      cJSON_AddStringToObject(root, "d", state.description);
    }

    if (state.send_pins && state.pins_json != nullptr) {
      cJSON* pins_obj = cJSON_Parse(state.pins_json);
      if (pins_obj) {
        cJSON_AddItemToObject(root, "p", pins_obj);
      } else {
        printf("[mqtt_sync] Failed to parse pins JSON: %s\r\n",
               state.pins_json);
      }
    }

    static char payload_buffer[1024];
    if (cJSON_PrintPreallocated(root, payload_buffer, sizeof(payload_buffer), 0)) {
      if (debug_enabled) {
        printf("[mqtt_sync] TX %s\r\n", payload_buffer);
      }

      if (mqtt.publish(publish_topic, payload_buffer)) {
        awaiting_response = true;
        last_publish_tick_ms = now_ms;
        publish_retry_delay_ms = Config::MQTT::PUBLISH_RETRY_DELAY_MS;
        response_timeout_count = 0;
      } else {
        awaiting_response = false;
        last_publish_tick_ms = now_ms;

        if (mqtt.getLastPublishError() == ERR_MEM) {
          publish_retry_delay_ms = (publish_retry_delay_ms < Config::MQTT::ERR_MEM_RETRY_DELAY_MS)
                                       ? Config::MQTT::ERR_MEM_RETRY_DELAY_MS
                                       : publish_retry_delay_ms * 2;

          if (publish_retry_delay_ms > Config::MQTT::MAX_ERR_MEM_RETRY_DELAY_MS) {
            publish_retry_delay_ms = Config::MQTT::MAX_ERR_MEM_RETRY_DELAY_MS;
          }
        }
      }
    } else {
      printf("[mqtt_sync] Payload too large for MQTT buffer.\r\n");
    }
    
    cJSON_Delete(root);
  }

  return true;
}

void MqttDashboardClient::updateResponseTopicForNodeId(const char* node_id) {
  if (node_id == nullptr || node_id[0] == '\0') {
    return;
  }

  etl::string<64> newTopic(Config::MQTT::SUB_TOPIC);
  newTopic.append("/");
  newTopic.append(node_id);

  if (response_topic == newTopic) {
    return;
  }

  response_topic = newTopic;
  mqtt.setSubscribeTopic(response_topic);
}

void MqttDashboardClient::parseServerResponse(const char* json,
                                              ServerCommand& response) {
  cJSON* root = cJSON_Parse(json);
  if (!root) {
    return;
  }

  cJSON* status = cJSON_GetObjectItem(root, "s");
  if (status && status->type == cJSON_String &&
      strcmp(status->valuestring, "ok") == 0) {
    response.status_ok = true;
  } else {
    cJSON_Delete(root);
    return;
  }

  cJSON* parsed_node_id = cJSON_GetObjectItem(root, "id");
  if (parsed_node_id && parsed_node_id->type == cJSON_String) {
    snprintf(response.new_node_id, sizeof(response.new_node_id), "%s",
             parsed_node_id->valuestring);
  }

  cJSON* parsed_description = cJSON_GetObjectItem(root, "d");
  if (parsed_description && parsed_description->type == cJSON_String) {
    snprintf(response.new_description, sizeof(response.new_description), "%s",
             parsed_description->valuestring);
  }

  cJSON* blink = cJSON_GetObjectItem(root, "b");
  response.should_blink = (blink && blink->type == cJSON_True);

  cJSON* force_full_sync = cJSON_GetObjectItem(root, "ffs");
  response.force_full_sync =
      (force_full_sync && force_full_sync->type == cJSON_True);

  cJSON_Delete(root);
}
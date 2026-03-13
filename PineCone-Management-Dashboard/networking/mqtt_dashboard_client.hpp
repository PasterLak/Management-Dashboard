#pragma once

#include "../include/config.hpp"
#include "i_dashboard_client.hpp"
#include "mqtt.hpp"

class MqttDashboardClient : public IDashboardClient {
 public:
  MqttDashboardClient(const char* user, const char* password,
                      const char* pub_topic, const char* sub_topic);

  bool sync(const char* server_ip, uint16_t port, const DeviceSyncState& state,
            ServerCommand& response) override;

  void setDebugEnabled(bool enabled) override;

  void setMQTTSubScribeTopic(etl::string<64> newTopic) {
    response_topic = newTopic;
    mqtt.setSubscribeTopic(newTopic);
  };

 private:
  MQTT mqtt;
  bool debug_enabled;
  const char* publish_topic;
  bool isConnecting = false;
  etl::string<64> response_topic;
  bool awaiting_response = false;
  uint32_t last_publish_tick_ms = 0;
  uint32_t publish_retry_delay_ms = Config::MQTT::PUBLISH_RETRY_DELAY_MS;
  uint8_t response_timeout_count = 0;

  void parseServerResponse(const char* json, ServerCommand& response);
  void updateResponseTopicForNodeId(const char* node_id);
  void resetSessionState();
};
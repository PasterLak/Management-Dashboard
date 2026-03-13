#include "mqtt.hpp"

extern "C" {
#include <bl_sec.h>
#include <FreeRTOS.h>
#include <lwip/ip_addr.h>
#include <stdio.h>
#include <string.h>
#include <task.h>
#include <lwip/apps/mqtt.h>
#include <lwip/apps/mqtt_opts.h>
#include <lwip/apps/mqtt_priv.h>

#if defined(ENABLE_MQTTS) && (ENABLE_MQTTS == 1)
#include <lwip/altcp_tls.h>
#endif
}

#if defined(ENABLE_MQTTS) && (ENABLE_MQTTS == 1)
#include "keys.hpp"
#endif

MQTT::MQTT(const char* u, const char* p, const char* subscribeTopic) {
    user = u;
    password = p;
    mqttConnected = false;
    newMessageReceived = false;
    publishInFlight = false;
    subscriptionReady = false;
    subscriptionInFlight = false;
    subscriptionReadyTickMs = 0;
    lastPublishError = ERR_OK;
    topicNr = 0;
    subscribedTopic = subscribeTopic;
    memset(&mqttClient,0,sizeof(mqttClient));
    memset(&mqttClient, 0, sizeof(mqttClient));
    memset(brokerIpString, 0, sizeof(brokerIpString));
    incomingMessageBuffer.clear();
    #if defined(ENABLE_MQTTS) && (ENABLE_MQTTS == 1)
        tls_config = nullptr;
    #endif
}

void MQTT::disconnect() {
    if (mqttConnected && !subscribedTopic.empty()) {
        mqtt_unsubscribe(&mqttClient, subscribedTopic.data(), nullptr, 0);
    }
    mqtt_disconnect(&mqttClient);
    mqttConnected = false;
    publishInFlight = false;
    subscriptionReady = false;
    subscriptionInFlight = false;
    subscriptionReadyTickMs = 0;
    printf("[%s] Done\r\n", "disconnect");
}

void MQTT::setSubscribeTopic(const etl::string<64>& newTopic) {
    if (subscribedTopic == newTopic) {
        return;
    }

    etl::string<64> oldTopic(subscribedTopic);
    subscribedTopic = newTopic;
    subscriptionReady = false;
    subscriptionInFlight = false;
    subscriptionReadyTickMs = 0;

    if (!mqttConnected) {
        return;
    }

    if (!oldTopic.empty()) {
        mqtt_unsubscribe(&mqttClient, oldTopic.data(), nullptr, 0);
    }

    requestSubscribe();
}

bool MQTT::requestSubscribe() {
    if (!mqttConnected || subscribedTopic.empty() || subscriptionInFlight || subscriptionReady) {
        return false;
    }

    err_t err = mqtt_subscribe(&mqttClient, subscribedTopic.data(), 0, MQTT::sub_request_cb, this);
    if (err == ERR_OK) {
        subscriptionInFlight = true;
        return true;
    }

    printf("[%s] Subscribe request failed: %d\r\n", "requestSubscribe", err);
    lastPublishError = err;
    return false;
}

bool MQTT::isReady() const {
    if (!mqttConnected || !subscriptionReady) {
        return false;
    }

    uint32_t now_ms = xTaskGetTickCount() * portTICK_PERIOD_MS;
    return (now_ms - subscriptionReadyTickMs) >= 500;
}

const char* MQTT::getNextMessage() {
    newMessageReceived = false;
    return lastMessage.c_str();
}

void MQTT::publish_cb(void *arg, err_t result) {
    MQTT* self = static_cast<MQTT*>(arg);
    if (self != nullptr) {
        self->publishInFlight = false;
        self->lastPublishError = result;
    }

    if (result == ERR_OK) {
        printf("[%s] Published message\r\n", "publish_cb");
    } else {
        printf("[%s] Could not publish message: %d\r\n", "publish_cb", result);
    }
}

bool MQTT::publish(const char* topic, const char* payloadStr) {
    static int err_mem_count = 0;

    if (!mqttConnected) {
        printf("[%s] Not connected\r\n", "publish");
        lastPublishError = ERR_CONN;
        return false;
    } 

    if (!subscriptionReady) {
        requestSubscribe();
        printf("[%s] Subscription not ready\r\n", "publish");
        lastPublishError = ERR_INPROGRESS;
        return false;
    }

    if (publishInFlight) {
        printf("[%s] Publish already in flight\r\n", "publish");
        lastPublishError = ERR_INPROGRESS;
        return false;
    }

    auto payload = etl::string_view(payloadStr);

    auto err = mqtt_publish(&mqttClient, topic, payload.data(),
                            payload.length(), 0, 0,
                            MQTT::publish_cb, this);
    if (err != ERR_OK) {
        lastPublishError = err;
        printf("[%s] Error: %d\r\n", "publish", err);

        // Catch ERR_MEM (-1): Out of memory / TX buffer full.
    if (err == -1) {
        err_mem_count++;
        printf("[%s] Warning: TX buffer full (ERR_MEM). Count: %d. Yielding CPU...\r\n", "publish", err_mem_count);
        
        vTaskDelay(pdMS_TO_TICKS(50)); 
        
        // If the buffer is permanently blocked, the TCP socket is a "Zombie".
        // Force a disconnect to trigger a clean reconnect.
        if (err_mem_count >= 10) {
            printf("[%s] Fatal: Buffer permanently blocked. Zombie connection detected. Forcing disconnect...\r\n", "publish");
            err_mem_count = 0; // Reset counter
            this->disconnect();
        }
        return false; 
    }

    // Reset the counter if any other error occurs
    err_mem_count = 0;

        // Disconnect immediately so the main loop can trigger a clean reconnect.
        if (err == -3 || err == -4) {
            printf("[%s] Fatal network error, forcing disconnect...\r\n", "publish");
            this->disconnect();
        }
        return false;
    }

    err_mem_count = 0;
    publishInFlight = true;
    lastPublishError = ERR_OK;
    return true;
}

void MQTT::incoming_topic_cb(void *arg, const char *topic, u32_t total_len) {
    (void) total_len;

    MQTT* self = static_cast<MQTT*>(arg);
    auto messageTopic = etl::string_view(topic);
    self->incomingMessageBuffer.clear();

    if (messageTopic == etl::string_view(self->subscribedTopic)) {
        self->topicNr = 0;
    } else {
        self->topicNr = 1;
    }
}

void MQTT::incoming_payload_cb([[gnu::unused]] void *arg, const u8_t *data, u16_t len, u8_t flags) {
    MQTT* self = static_cast<MQTT*>(arg);
    if (self->topicNr != 0) {
        return;
    }

    size_t free_space = self->incomingMessageBuffer.max_size() - self->incomingMessageBuffer.size();
    size_t bytes_to_copy = (len < free_space) ? len : free_space;

    if (bytes_to_copy > 0) {
        self->incomingMessageBuffer.append(reinterpret_cast<const char*>(data), bytes_to_copy);
    }

    if (flags & MQTT_DATA_FLAG_LAST) {
        self->lastMessage = self->incomingMessageBuffer;
        self->newMessageReceived = true;
        printf("Received message: %s\r\n", self->lastMessage.c_str());
    }
}

void MQTT::sub_request_cb(void *arg, err_t result) {
    MQTT* self = static_cast<MQTT*>(arg);
    if (self != nullptr) {
        self->subscriptionInFlight = false;
        self->subscriptionReady = (result == ERR_OK);
        self->subscriptionReadyTickMs = self->subscriptionReady
                                            ? (xTaskGetTickCount() * portTICK_PERIOD_MS)
                                            : 0;
        self->lastPublishError = result;
    }

    if (result == ERR_OK) {
        printf("[%s] Subscribed\r\n", "sub_request_cb");
    } else {
        printf("[%s] Error: %d\r\n", "sub_request_cb", result);
    }
}

void MQTT::connected_cb(mqtt_client_t *client, void *arg, mqtt_connection_status_t status) {
    (void)client;

    if (arg == nullptr) {
        printf("[%s] Fatal Error: 'arg' is NULL! Ignoring callback.\r\n", "connected_cb");
        return;
    }


    MQTT* self = static_cast<MQTT*>(arg);

    if (status == MQTT_CONNECT_ACCEPTED) {
        printf("[%s] Connected\r\n", "connected_cb");
        self->mqttConnected = true;
        self->subscriptionReady = false;
        self->subscriptionInFlight = false;
        self->subscriptionReadyTickMs = 0;

        mqtt_set_inpub_callback(&self->mqttClient, MQTT::incoming_topic_cb,
                                MQTT::incoming_payload_cb, self);

        self->requestSubscribe();
    } else {
        self->mqttConnected = false;
        self->publishInFlight = false;
        self->subscriptionReady = false;
        self->subscriptionInFlight = false;
        self->subscriptionReadyTickMs = 0;
        printf("[%s] Disconnected/Error\r\n", "connected_cb");
    }
}

void MQTT::connectToIP(const char* brokerIP) {
    if (brokerIP != nullptr) {
        strncpy(this->brokerIpString, brokerIP, sizeof(this->brokerIpString) - 1);
    }

    int ip1, ip2, ip3, ip4;
    sscanf(this->brokerIpString, "%d.%d.%d.%d", &ip1, &ip2, &ip3, &ip4);
    IP_ADDR4(&this->mqttBrokerIp, ip1, ip2, ip3, ip4);

    int randomId = (int)bl_rand();
    clientIdStr.resize(16);
    snprintf(clientIdStr.data(), clientIdStr.size() + 1, "%02x", randomId);

    memset(&client_info, 0, sizeof(client_info));
    client_info.client_id = clientIdStr.data();
    client_info.client_user = user;
    client_info.client_pass = password;
    client_info.keep_alive = 60;

#if defined(ENABLE_MQTTS) && (ENABLE_MQTTS == 1)
    if (this->tls_config != nullptr) {
        altcp_tls_free_config(this->tls_config); 
    }
    
    this->tls_config = altcp_tls_create_config_client_2wayauth(
        (const u8_t*)CA_CERT.data(), CA_CERT_LEN, 
        (const u8_t*)PRIV_KEY.data(), PRIV_KEY_LEN, 
        nullptr, 0,
        (const u8_t*)CERT.data(), CERT_LEN);
        
    this->client_info.tls_config = this->tls_config;
    
    mqtt_client_connect(&mqttClient, &mqttBrokerIp, 8883, MQTT::connected_cb, this, &this->client_info);
#else
    mqtt_client_connect(&mqttClient, &mqttBrokerIp, 1883, MQTT::connected_cb, this, &this->client_info);
#endif
}
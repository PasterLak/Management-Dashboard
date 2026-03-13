#pragma once

#include <stdint.h>

#if __has_include("private_config.hpp")
#include "private_config.hpp"
#endif

namespace Config {

// Build Information
constexpr uint8_t BUILD_VERSION = 7;

/*
LED Pin	BL602 Pin	Remap Pin Function
LED Blue	IO 11	JTAG → PWM
LED Green	IO 14	JTAG → PWM
LED Red	IO 17	JTAG → PWM
*/
namespace LED {
constexpr uint8_t PIN = 11;  // Blue

// Timing Configuration
// constexpr float DASHBOARD_UPDATE_INTERVAL_SEC = 0.025f;
// constexpr float DASHBOARD_UPDATE_INTERVAL_SEC = 0.04f; // for MQTT
// unencrypted
constexpr float BLINK_INTERVAL_SEC = 0.5f;
}  // namespace LED

namespace MQTT {
constexpr const char* USER = "suas";
constexpr const char* PASSWORD = "J4auBDJYzcrL8s9TEZJt";
#define ENABLE_MQTTS 0
#define USE_MQTT 0
#define USE_HTTP ((ENABLE_MQTT == 1) && (ENABLE_MQTTS == 1))

#if defined(ENABLE_MQTTS) && (ENABLE_MQTTS == 1)

constexpr const char* PUB_TOPIC = "/api/data/tls";
constexpr const char* SUB_TOPIC = "/api/data/response/tls";
#else

constexpr const char* PUB_TOPIC = "/api/data/plain";
constexpr const char* SUB_TOPIC = "/api/data/response/plain";
#endif

#if defined(ENABLE_MQTTS) && (ENABLE_MQTTS == 1)
constexpr uint32_t DEVIDER = 8;
#else
constexpr uint32_t DEVIDER = 10;
#endif

constexpr uint32_t RESPONSE_TIMEOUT_MS = 1200 / DEVIDER;
constexpr uint32_t IDLE_POLL_INTERVAL_MS = 500 / DEVIDER;
constexpr uint32_t PUBLISH_RETRY_DELAY_MS = 250 / DEVIDER;
constexpr uint32_t PUBLISH_STALL_TIMEOUT_MS = 2500 / DEVIDER;
constexpr uint32_t ERR_MEM_RETRY_DELAY_MS = 1200 / DEVIDER;
constexpr uint32_t MAX_ERR_MEM_RETRY_DELAY_MS = 2500 / DEVIDER;
constexpr uint8_t MAX_RESPONSE_TIMEOUTS_BEFORE_RECONNECT = 2;

}  // namespace MQTT

#if (USE_MQTT == 0)
constexpr float DASHBOARD_UPDATE_INTERVAL_SEC = 0.01f;  // HTTP
#elif ((USE_MQTT == 1) && (defined(ENABLE_MQTTS) && (ENABLE_MQTTS == 0)))
constexpr float DASHBOARD_UPDATE_INTERVAL_SEC = 0.015f;  // MQTT
#elif ((USE_MQTT == 1) && (defined(ENABLE_MQTTS) && (ENABLE_MQTTS == 1)))
constexpr float DASHBOARD_UPDATE_INTERVAL_SEC = 0.02f;  // MQTTS

#endif

namespace WIFI {

#ifdef PRIVATE_WIFI_SSID
constexpr const char* SSID = PRIVATE_WIFI_SSID;
#else
constexpr const char* SSID = "wifi_name";
#endif

#ifdef PRIVATE_WIFI_PASSWORD
constexpr const char* PASSWORD = PRIVATE_WIFI_PASSWORD;
#else
constexpr const char* PASSWORD = "wifi_password";
#endif

}  // namespace WIFI

#ifdef PRIVATE_DASHBOARD_SERVER_IP
constexpr const char* DASHBOARD_SERVER_IP = PRIVATE_DASHBOARD_SERVER_IP;
#else
constexpr const char* DASHBOARD_SERVER_IP = "192.168.0.1";
#endif

constexpr uint16_t DASHBOARD_SERVER_PORT = 80;

}  // namespace Config
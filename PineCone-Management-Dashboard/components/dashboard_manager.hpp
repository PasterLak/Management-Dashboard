#pragma once

#include "i_dashboard_client.hpp"
#include "pins_manager.hpp"
#include "../networking/wifi_handler.hpp"

class DashboardManager {
 public:
  DashboardManager(WIFIHandler& wlan_handler, IDashboardClient& client,
                   PinsManager& pinsManager, const char* server_ip,
                   uint16_t server_port, float update_interval_sec);

  bool update(float delta_time_sec);
  bool shouldBlink() const;
  void setDebugEnabled(bool enabled);

 private:
  WIFIHandler& wlan;
  IDashboardClient& client;
  PinsManager& _pinsManager;

  const char* server_ip;
  uint16_t server_port;
  float update_interval_sec;
  float time_accumulator;

  bool connected;
  uint32_t last_pins_version;

  char node_id[64] = "";
  char description[128] = "";
  char last_sent_description[128] = "";
  char last_sent_pins_json[768] = "{}";
  char cached_pins_json[768];

  bool startup_handshake_done = false;
  bool force_full_sync_next = false;
  bool should_blink_state = false;
  bool debug_enabled = true;
  

  void initNodeIdFromMac();
  void markConnectionLost();
  void sendDataToDashboard();
  void logDashboardInfo();
};
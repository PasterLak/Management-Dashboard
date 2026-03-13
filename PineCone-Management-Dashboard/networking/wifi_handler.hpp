#pragma once

#include <stdint.h>

extern "C" {
#include <FreeRTOS.h>
#include <task.h>
#include <wifi_mgmr_ext.h>
}

#include "extentions/log.hpp"

class WIFIHandler {
 public:
  WIFIHandler(const char* mySsid, const char* myPassword);

  void start();
  bool isConnected();
  char* get_ip_address();
  void get_mac_address(uint8_t mac[6]);

  char* getMacAdressAsString();

  void setDebugEnabled(bool enabled) {
    debug_enabled = enabled;
  }

 private:
  const char* ssid;
  const char* password;
  bool wifi_initialized = false;
  bool debug_enabled = true;

  void log(const char* message) const {
    if (debug_enabled) {
      Log::println(message);
    }
  }
};
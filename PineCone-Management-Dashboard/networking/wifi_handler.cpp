#include "wifi_handler.hpp"

extern "C" {
#include <easyflash.h>
#include <event_device.h>
#include <hal_wifi.h>
#include <lwip/inet.h>
#include <lwip/sockets.h>
#include <stdio.h>
#include <vfs.h>
}

WIFIHandler::WIFIHandler(const char* mySsid, const char* myPassword)
    : ssid(mySsid), password(myPassword) {}

void WIFIHandler::start() {
  if (!wifi_initialized) {
    static wifi_conf_t conf{.country_code = "EU", .channel_nums = {}};

    easyflash_init();
    vfs_init();
    vfs_device_init();

    hal_wifi_start_firmware_task();
    vTaskDelay(pdMS_TO_TICKS(500));
    wifi_mgmr_start_background(&conf);

    wifi_initialized = true;
  }

  auto wifi_interface = wifi_mgmr_sta_enable();
  wifi_mgmr_sta_connect(&wifi_interface, (char*)ssid, (char*)password, nullptr,
                        0, 0, 0);
  wifi_mgmr_sta_autoconnect_enable();
}

bool WIFIHandler::isConnected() {
  int state;
  wifi_mgmr_state_get(&state);
  return (state == 4);
}

char* WIFIHandler::get_ip_address() {
  uint32_t ip, mask;
  wifi_mgmr_ap_ip_get(&ip, nullptr, &mask);

  struct in_addr ip_addr;
  ip_addr.s_addr = ip;

  return inet_ntoa(ip_addr);
}

void WIFIHandler::get_mac_address(uint8_t mac[6]) {
  wifi_mgmr_sta_mac_get(mac);
}

char* WIFIHandler::getMacAdressAsString(){
    uint8_t mac[6];
    static char macStr[18];
    wifi_mgmr_sta_mac_get(mac);

    snprintf(macStr, sizeof(macStr), "mac-%02x%02x%02x%02x%02x%02x", mac[0],
           mac[1], mac[2], mac[3], mac[4], mac[5]);

    return macStr;
}
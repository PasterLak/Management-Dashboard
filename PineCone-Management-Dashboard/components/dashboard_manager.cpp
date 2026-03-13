#include "dashboard_manager.hpp"

#include "../extentions/log.hpp"
#include "../data/json_pins_formatter.hpp"
#include "../data/pins_serializer.hpp"

extern "C" {
#include <stdio.h>
#include <string.h>
}

DashboardManager::DashboardManager(WIFIHandler& wlan_handler,
                                   IDashboardClient& client,
                                   PinsManager& pinsManager,
                                   const char* server_ip, uint16_t server_port,
                                   float update_interval_sec)
    : wlan(wlan_handler),
      client(client),
      _pinsManager(pinsManager),
      server_ip(server_ip),
      server_port(server_port),
      update_interval_sec(update_interval_sec),
      time_accumulator(0.0f),
      connected(false),
      last_pins_version(0xFFFFFFFF) {
  cached_pins_json[0] = '\0';
}

void DashboardManager::setDebugEnabled(bool enabled) {
  debug_enabled = enabled;
  client.setDebugEnabled(enabled);
}

void DashboardManager::initNodeIdFromMac() {
  uint8_t mac[6];
  wlan.get_mac_address(mac);
  snprintf(node_id, sizeof(node_id), "mac-%02x%02x%02x%02x%02x%02x", mac[0],
           mac[1], mac[2], mac[3], mac[4], mac[5]);
}

void DashboardManager::markConnectionLost() {
  connected = false;
  should_blink_state = false;
  startup_handshake_done = false;
  force_full_sync_next = true;
}

bool DashboardManager::update(float delta_time_sec) {
  if (delta_time_sec <= 0.0f) {
    return connected;
  }

  time_accumulator += delta_time_sec;
  if (time_accumulator < update_interval_sec) {
    return connected;
  }

  time_accumulator -= update_interval_sec;

  if (!wlan.isConnected()) {
    markConnectionLost();
    return false;
  }

  if (node_id[0] == '\0') {
    initNodeIdFromMac();
  }

  sendDataToDashboard();

  if (connected) {
    logDashboardInfo();
  }

  return connected;
}

bool DashboardManager::shouldBlink() const {
  return connected && should_blink_state;
}

void DashboardManager::sendDataToDashboard() {
  if (!server_ip || server_ip[0] == '\0' || server_port == 0) {
    return;
  }

  uint32_t current_version = _pinsManager.getVersion();
  if (current_version != last_pins_version) {
    JsonPinsFormatter jsonFormatter;
    PinsSerializer serializer(jsonFormatter);
    serializer.serialize(_pinsManager, cached_pins_json,
                         sizeof(cached_pins_json));
    last_pins_version = current_version;
  }

  bool sending_full_sync = force_full_sync_next;

  bool desc_changed = (strcmp(description, last_sent_description) != 0);
  bool pins_changed = (strcmp(cached_pins_json, last_sent_pins_json) != 0);
  bool send_only_node_id = (!startup_handshake_done && !sending_full_sync);
  bool has_description = (description[0] != '\0');
  bool send_desc_now =
      !send_only_node_id && (desc_changed || (sending_full_sync && has_description));
  bool send_pins_now = !send_only_node_id && (sending_full_sync || pins_changed);

  if (send_desc_now && send_pins_now) {
    if (has_description) {
      send_pins_now = false;
    } else {
      send_desc_now = false;
    }
  }

  DeviceSyncState state;
  state.node_id = node_id;
  state.description = description;
  state.pins_json = cached_pins_json;
  state.send_full_sync = sending_full_sync;
  state.send_desc = send_desc_now;
  state.send_pins = send_pins_now;

  ServerCommand response;
  bool success = client.sync(server_ip, server_port, state, response);

  if (!success) {
    markConnectionLost();
    return;
  }

  if (!response.has_response) {
    return;
  }

  if (!response.status_ok) {
    markConnectionLost();
    return;
  }

  connected = true;

  if (response.new_node_id[0] != '\0') {
    snprintf(node_id, sizeof(node_id), "%s", response.new_node_id);
  }

  if (response.new_description[0] != '\0') {
    snprintf(description, sizeof(description), "%s", response.new_description);
  }

  should_blink_state = response.should_blink;

  if (state.send_desc || state.send_pins) {
    startup_handshake_done = true;
    force_full_sync_next = false;
  }

  if (state.send_desc) {
    snprintf(last_sent_description, sizeof(last_sent_description), "%s",
             description);
  }

  if (state.send_pins) {
    snprintf(last_sent_pins_json, sizeof(last_sent_pins_json), "%s",
             cached_pins_json);
  }

  if (response.force_full_sync) {
    force_full_sync_next = true;
  }
}

void DashboardManager::logDashboardInfo() {
  if (node_id[0] == '\0') {
    return;
  }

  if (description[0] != '\0') {
    (void)description;
  }
}
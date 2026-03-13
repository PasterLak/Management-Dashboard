#pragma once

#include <stdint.h>

struct DeviceSyncState {
  const char* node_id;
  const char* description;
  const char* pins_json;
  bool send_full_sync;
  bool send_desc;
  bool send_pins;
};

struct ServerCommand {
  bool has_response;
  bool status_ok;
  char new_node_id[64];
  char new_description[128];
  bool should_blink;
  bool force_full_sync;
};

class IDashboardClient {
 public:
  virtual ~IDashboardClient() = default;

  virtual bool sync(const char* server_ip, uint16_t port,
                    const DeviceSyncState& state,
                    ServerCommand& response) = 0;

  virtual void setDebugEnabled(bool enabled) = 0;
};
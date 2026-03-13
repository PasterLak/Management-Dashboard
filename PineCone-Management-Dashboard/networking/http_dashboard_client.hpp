#pragma once

#include "i_dashboard_client.hpp"
#include "http.hpp"

class HttpDashboardClient : public IDashboardClient {
 public:
  bool sync(const char* server_ip, uint16_t port, const DeviceSyncState& state,
            ServerCommand& response) override;

  void setDebugEnabled(bool enabled) override;

 private:
  HTTP http_client;
  void parseServerResponse(const char* json, ServerCommand& response);
};
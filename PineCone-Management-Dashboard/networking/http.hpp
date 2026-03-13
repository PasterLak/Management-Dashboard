#pragma once

#include <stddef.h>
#include <stdint.h>

extern "C" {
#include <lwip/inet.h>
#include <lwip/netdb.h>
#include <lwip/sockets.h>
}

#include "extentions/log.hpp"

class HTTP {
private:
    int socket_fd = -1;
    char response_buffer[1024];
    bool debug_enabled = true;

    bool connectToServer(const char* server_ip, uint16_t port);
    bool sendRequest(const char* method, const char* path, const char* host,
                     uint16_t port, const char* body);
    bool receiveResponse();
    void closeConnection();

    template <typename... Args>
    void log(const char* fmt, Args... args) const {
        if (debug_enabled) {
            Log::println(fmt, args...);
        }
    }

public:
    HTTP() = default;
    ~HTTP() = default;

    void setDebugEnabled(bool enabled) { debug_enabled = enabled; }

    // Sends HTTP POST request with JSON payload
    bool post(const char* server_ip, uint16_t port, const char* path,
              const char* json_payload);

    // Get the response body (after HTTP headers)
    const char* getResponseBody();

    // Get full response (including headers)
    const char* getFullResponse() { return response_buffer; }
};

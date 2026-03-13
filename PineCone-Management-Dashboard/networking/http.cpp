#include "http.hpp"
#include <string.h>
#include <stdio.h>



bool HTTP::connectToServer(const char* server_ip, uint16_t port) {
    log("[HTTP] Creating socket...");
    socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    log("[HTTP] Socket fd: {}", socket_fd);

    if (socket_fd < 0) {
        log("[HTTP] ERROR: Socket creation failed");
        return false;
    }

    log("[HTTP] Setting up server address {}:{}", server_ip, port);
    struct sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    server_addr.sin_addr.s_addr = inet_addr(server_ip);

    log("[HTTP] Connecting...");
    int result = ::connect(socket_fd, (struct sockaddr*)&server_addr, sizeof(server_addr));
    log("[HTTP] Connect result: {}", result);

    if (result < 0) {
        log("[HTTP] ERROR: Connection to {}:{} failed", server_ip, port);
        closeConnection();
        return false;
    }

    log("[HTTP] Connected successfully!");
    return true;
}

bool HTTP::sendRequest(const char* method, const char* path,
                             const char* host, uint16_t port,
                             const char* body) {
    char request[768];
    int content_length = body ? strlen(body) : 0;

    if (body) {
        snprintf(request, sizeof(request),
                 "%s %s HTTP/1.1\r\n"
                 "Host: %s:%d\r\n"
                 "Content-Type: application/json\r\n"
                 "Content-Length: %d\r\n"
                 "Connection: close\r\n"
                 "\r\n"
                 "%s",
                 method, path, host, port, content_length, body);
    } else {
        snprintf(request, sizeof(request),
                 "%s %s HTTP/1.1\r\n"
                 "Host: %s:%d\r\n"
                 "Connection: close\r\n"
                 "\r\n",
                 method, path, host, port);
    }

    if (write(socket_fd, request, strlen(request)) < 0) {
        log("[HTTP] ERROR: Sending failed");
        return false;
    }

    log("[HTTP] Sent: {}", body ? body : "(no body)");
    return true;
}

bool HTTP::receiveResponse() {
    int total_bytes = 0;
    int bytes;

    while ((bytes = read(socket_fd, response_buffer + total_bytes,
                         sizeof(response_buffer) - total_bytes - 1)) > 0) {
        total_bytes += bytes;
        if (total_bytes >= (int)(sizeof(response_buffer) - 1)) {
            break;
        }
    }

    if (total_bytes <= 0) {
        log("[HTTP] ERROR: No response received");
        return false;
    }

    response_buffer[total_bytes] = '\0';
    return true;
}

void HTTP::closeConnection() {
    if (socket_fd >= 0) {
        close(socket_fd);
        socket_fd = -1;
    }
}

bool HTTP::post(const char* server_ip, uint16_t port, const char* path,
                      const char* json_payload) {
    if (!connectToServer(server_ip, port)) {
        return false;
    }

    if (!sendRequest("POST", path, server_ip, port, json_payload)) {
        closeConnection();
        return false;
    }

    if (!receiveResponse()) {
        closeConnection();
        return false;
    }

    closeConnection();
    return true;
}

const char* HTTP::getResponseBody() {
    // Find JSON body (after \r\n\r\n)
    const char* body = strstr(response_buffer, "\r\n\r\n");
    if (body) {
        return body + 4;  // Skip \r\n\r\n
    }
    return nullptr;
}

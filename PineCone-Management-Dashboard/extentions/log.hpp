#pragma once

extern "C" {
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

#include "bl_uart.h"
}

// ##### SIMPLE FORMATTING LOGGER #####
//
//   Log::println("Hello {}!", name);
//   Log::println("Money: {}", 5);  // prints: Money: 5
//
//   Use setSeparatorEnabled(bool) to enable/disable space between args
//

class Log {
 public:
  static void setSeparatorEnabled(bool enabled) { separator_enabled = enabled; }

  static void print(const char* text) {
    writeString(text);
  }

  static void println(const char* text) {
    writeString(text);
    writeChar('\r');
    writeChar('\n');
  }

  template <typename... Args>
  static void print(const char* fmt, Args... args) {
    char buffer[256];
    formatToBuffer(buffer, sizeof(buffer), fmt, args...);
    writeString(buffer);
  }

  template <typename... Args>
  static void println(const char* fmt, Args... args) {
    char buffer[256];
    formatToBuffer(buffer, sizeof(buffer), fmt, args...);
    writeString(buffer);
    writeChar('\r');
    writeChar('\n');
  }

  template <typename... Args>
  static bool formatToBuffer(char* out, size_t out_size,
                             const char* fmt, Args... args) {
    if (!out || out_size == 0) return false;
    size_t pos = 0;
    formatFmt(out, out_size, pos, fmt, args...);
    if (pos < out_size)
      out[pos] = '\0';
    else
      out[out_size - 1] = '\0';
    return true;
  }

 private:
  inline static bool separator_enabled = true;

  static void writeChar(char c) {
    bl_uart_data_send(0, static_cast<uint8_t>(c));
  }

  static void writeString(const char* s) {
    while (*s) writeChar(*s++);
  }

  static void putChar(char* out, size_t size, size_t& pos, char c) {
    if (pos + 1 < size) out[pos++] = c;
  }

  static void putString(char* out, size_t size, size_t& pos, const char* s) {
    while (*s) putChar(out, size, pos, *s++);
  }

  static void putValue(char* out, size_t size, size_t& pos, const char* v) {
    putString(out, size, pos, v);
  }

  static void putValue(char* out, size_t size, size_t& pos, bool v) {
    putString(out, size, pos, v ? "true" : "false");
  }

  template <typename T>
  static void putValue(char* out, size_t size, size_t& pos, T v) {
    char tmp[32];
    snprintf(tmp, sizeof(tmp), "%d", (int)v);
    putString(out, size, pos, tmp);
  }

  static void putValue(char* out, size_t size, size_t& pos, double v) {
    char tmp[32];
    int ip = (int)v;
    int fp = (int)((v - ip) * 1000 + 0.5);
    snprintf(tmp, sizeof(tmp), "%d.%03d", ip, fp);
    putString(out, size, pos, tmp);
  }
  static void putValue(char* out, size_t size, size_t& pos, float v) {
      putValue(out, size, pos, static_cast<double>(v));
  }

  static void formatFmt(char* out, size_t size, size_t& pos,
                        const char* fmt) {
    while (*fmt) putChar(out, size, pos, *fmt++);
  }

  template <typename T, typename... Rest>
  static void formatFmt(char* out, size_t size, size_t& pos,
                        const char* fmt, T value, Rest... rest) {
    while (*fmt) {
      if (*fmt == '{' && *(fmt + 1) == '}') {
        putValue(out, size, pos, value);
        formatFmt(out, size, pos, fmt + 2, rest...);
        return;
      }
      putChar(out, size, pos, *fmt++);
    }

    if (separator_enabled) putChar(out, size, pos, ' ');
    putValue(out, size, pos, value);
    formatRest(out, size, pos, rest...);
  }

  static void formatRest(char*, size_t, size_t&) {}

  template <typename T, typename... Rest>
  static void formatRest(char* out, size_t size, size_t& pos,
                         T value, Rest... rest) {
    if (separator_enabled) putChar(out, size, pos, ' ');
    putValue(out, size, pos, value);
    formatRest(out, size, pos, rest...);
  }
};

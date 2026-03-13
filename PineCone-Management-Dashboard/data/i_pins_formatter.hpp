#pragma once

#include <stddef.h>
#include <stdint.h>

class IPinsFormatter {
 public:
  virtual ~IPinsFormatter() = default;

  virtual void begin(char* buffer, size_t buffer_size, size_t& offset) = 0;
  virtual bool formatPin(char* buffer, size_t buffer_size, size_t& offset,
                         uint8_t pin, const char* name, const char* mode,
                         const char* value, bool is_first) = 0;
  virtual void end(char* buffer, size_t buffer_size, size_t& offset) = 0;
};
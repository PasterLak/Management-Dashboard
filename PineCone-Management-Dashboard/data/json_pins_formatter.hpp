#pragma once

#include "i_pins_formatter.hpp"

class JsonPinsFormatter : public IPinsFormatter {
 public:
  void begin(char* buffer, size_t buffer_size, size_t& offset) override;
  bool formatPin(char* buffer, size_t buffer_size, size_t& offset, uint8_t pin,
                 const char* name, const char* mode, const char* value,
                 bool is_first) override;
  void end(char* buffer, size_t buffer_size, size_t& offset) override;
};
#include "json_pins_formatter.hpp"

#include <stdio.h>

void JsonPinsFormatter::begin(char* buffer, size_t buffer_size, size_t& offset) {
  if (offset < buffer_size) {
    int written = snprintf(buffer + offset, buffer_size - offset, "{");
    if (written > 0) {
      offset += written;
    }
  }
}

bool JsonPinsFormatter::formatPin(char* buffer, size_t buffer_size,
                                  size_t& offset, uint8_t pin, const char* name,
                                  const char* mode, const char* value,
                                  bool is_first) {
  if (offset >= buffer_size) {
    return false;
  }

  const char* prefix = is_first ? "" : ",";
  int written = snprintf(
      buffer + offset, buffer_size - offset,
      "%s\"GPIO%d\":{\"n\":\"%s\",\"m\":\"%s\",\"v\":\"%s\"}", prefix,
      pin, name, mode, value);

  if (written > 0 && (size_t)written < (buffer_size - offset)) {
    offset += written;
    return true;
  }

  return false;
}

void JsonPinsFormatter::end(char* buffer, size_t buffer_size, size_t& offset) {
  if (offset < buffer_size) {
    int written = snprintf(buffer + offset, buffer_size - offset, "}");
    if (written > 0) {
      offset += written;
    }
  }
}
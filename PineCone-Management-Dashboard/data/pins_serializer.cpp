#include "pins_serializer.hpp"

PinsSerializer::PinsSerializer(IPinsFormatter& formatter)
    : formatter_(formatter) {}

void PinsSerializer::serialize(const PinsManager& pinsManager, char* buffer,
                               size_t buffer_size) {
  if (!buffer || buffer_size == 0) {
    return;
  }

  size_t offset = 0;
  buffer[0] = '\0';

  formatter_.begin(buffer, buffer_size, offset);

  bool first_pin = true;

  for (uint8_t pin = 0; pin < MAX_PINS_REGISTRY; ++pin) {
    if (!pinsManager.isConfigured(pin)) {
      continue;
    }

    const char* name = pinsManager.getName(pin);
    const char* mode = pinsManager.getModeString(pin);
    const char* value = pinsManager.getValueString(pin);

    bool success = formatter_.formatPin(buffer, buffer_size, offset, pin, name,
                                        mode, value, first_pin);
    if (!success) {
      break;
    }

    first_pin = false;
  }

  formatter_.end(buffer, buffer_size, offset);
}
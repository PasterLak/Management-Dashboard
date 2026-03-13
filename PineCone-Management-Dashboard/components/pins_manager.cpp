#include "pins_manager.hpp"

PinsManager::PinsManager() {
  for (int i = 0; i < MAX_PINS_REGISTRY; i++) {
    pins_[i].mode = INPUT;
    pins_[i].name[0] = '\0';
    pins_[i].value_string[0] = '\0';
    pins_[i].isConfigured = false;
  }
}

uint32_t PinsManager::getVersion() const {
  return version_;
}

void PinsManager::registerPin(uint8_t pin, const char* name, uint8_t mode) {
  if (!isValid(pin)) return;

    pins_[pin].mode = mode;
    pins_[pin].isConfigured = true;
    pinMode(pin,mode);

    setName(pin, name);
    version_++;
}

uint8_t PinsManager::getMode(uint8_t pin) const {

  return pins_[pin].mode;
}

bool PinsManager::isConfigured(uint8_t pin) const {
  return pins_[pin].isConfigured;
}

const char* PinsManager::getModeString(uint8_t pin) const {
  switch (getMode(pin)) {
    case 0:
      return "input";
    case 1:
      return "output";
    case 2:
      return "pullup";
    case 3:
      return "pulldown";
    default:
      return "unconfigured";
  }
}


void PinsManager::setName(uint8_t pin, const char* name) {
  if (isValid(pin) && name) {
    if (strncmp(pins_[pin].name, name, sizeof(pins_[pin].name)) != 0) {
      strncpy(pins_[pin].name, name, sizeof(pins_[pin].name) - 1);
      pins_[pin].name[sizeof(pins_[pin].name) - 1] = '\0';
      version_++;
    }
  }
}

const char* PinsManager::getName(uint8_t pin) const {
  if (!isValid(pin))
    return "";
  if (pins_[pin].name[0] != '\0')
    return pins_[pin].name;

  static char buf[16];
  snprintf(buf, sizeof(buf), "gpio%d", pin);
  return buf;
}

void PinsManager::setValueString(uint8_t pin, const char* value) {
  if (isValid(pin) && value) {
    if (strncmp(pins_[pin].value_string, value, sizeof(pins_[pin].value_string)) != 0) {
      strncpy(pins_[pin].value_string, value, sizeof(pins_[pin].value_string) - 1);
      pins_[pin].value_string[sizeof(pins_[pin].value_string) - 1] = '\0';
      version_++;
    }
  }
}

const char* PinsManager::getValueString(uint8_t pin) const {
  if (!isValid(pin)) return "0";
  if (pins_[pin].value_string[0] != '\0') return pins_[pin].value_string;

  return "0";
}
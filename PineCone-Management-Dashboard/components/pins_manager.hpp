#pragma once

#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "../pins.hpp"

#define MAX_PINS_REGISTRY 23

class PinsManager {
 public:
  PinsManager();

  
  void registerPin(uint8_t pin, const char* name, uint8_t mode);

  uint8_t getMode(uint8_t pin) const;
  bool isConfigured(uint8_t pin) const;
  const char* getModeString(uint8_t pin) const;

  void setName(uint8_t pin, const char* name);
  const char* getName(uint8_t pin) const;

  void setValueString(uint8_t pin, const char* value);
  const char* getValueString(uint8_t pin) const;

  uint32_t getVersion() const;

 private:
  struct PinState {
    uint8_t mode;
    char name[16];
    char value_string[32];
    bool isConfigured = false;
  };

  PinState pins_[MAX_PINS_REGISTRY];
  uint32_t version_ = 0;
  
  bool isValid(uint8_t pin) const { return pin < MAX_PINS_REGISTRY; }
};
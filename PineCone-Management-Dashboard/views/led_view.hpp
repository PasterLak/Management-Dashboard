#pragma once

extern "C" {
    #include <stdint.h>
}


#include "blink.hpp"
#include "components/pins_manager.hpp"

// controls LED behavior based on connection state
class LEDView {
 public:
  LEDView(uint8_t pin, float blink_interval_sec, PinsManager& pinsManager);

  void initialize();

  void update(bool is_connected, bool should_blink, float delta_time_sec);

 private:


  Blink led;
  uint8_t pin;
  float blink_interval_sec;
  float blink_time;
  PinsManager& _pinsManager;
  bool _cachedState;

  void setState(bool state);
  void updateBlinking();
};
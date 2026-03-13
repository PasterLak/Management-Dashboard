#include "led_view.hpp"

extern "C" {
#include <stdio.h>
}

#include "../pins.hpp"

LEDView::LEDView(uint8_t pin, float blink_interval_sec,
                 PinsManager& pinsManager)
    : led(pin),
      pin(pin),
      blink_interval_sec(blink_interval_sec),
      blink_time(0.0f),
      _pinsManager(pinsManager),
      _cachedState(false) {}

void LEDView::initialize() {
  _cachedState = false;
  _pinsManager.registerPin(pin, "LED", OUTPUT);
}

void LEDView::update(bool is_connected, bool should_blink,
                     float delta_time_sec) {
  if (!is_connected) {
    setState(false);
    return;
  }

  if (should_blink) {
    blink_time += delta_time_sec;
    if (blink_time >= blink_interval_sec) {
      updateBlinking();
    }
  } else {
    setState(true);
  }
}

void LEDView::setState(bool state) {
  if (_cachedState == state)
    return;

  if (state) {
    led.on();
    _pinsManager.setValueString(pin, "On");
  } else {
    led.off();
    _pinsManager.setValueString(pin, "Off");
  }

  _cachedState = state;
  blink_time = 0.0f;
}

void LEDView::updateBlinking() {
  blink_time = 0.0f;
  led.toggle();

  if (_cachedState != led.isActive()) {
    // LED is inverted: LOW (0) = On, HIGH (1) = Off
    _pinsManager.setValueString(pin, _cachedState ? "On" : "Off");
    _cachedState = !_cachedState;
    printf("[LED] Toggle\r\n");
  }
}

#include "button.hpp"

extern "C" {
#include "bl_timer.h"
}
#include "pins.hpp"

Button::Button(uint8_t pin) {
  this->_pin = pin;
  pinMode(pin, INPUT_PULLUP);
}

void Button::update() {
  lastState = state;

  bool reading = digitalRead(_pin);

  if (reading != lastStableState) {
    lastDebounceTime = bl_timer_now_us64();
    lastStableState = reading;
  }

  if ((bl_timer_now_us64() - lastDebounceTime) > debounceDelay) {
    state = reading;
  }
}

bool Button::isPressed() { return state; }

bool Button::isDown() { return (!lastState && state); }

bool Button::isUp() { return (lastState && !state); }

bool Button::getState() { return state; }

bool Button::getLastState() { return lastState; }

void Button::setDebounceDelayUS(uint32_t delay_us) { debounceDelay = delay_us; }

void Button::setDebounceDelayMS(uint32_t delay_ms) {
  debounceDelay = delay_ms * 1000;
}
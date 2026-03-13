#include "blink.hpp"

extern "C" {
}

#include "../pins.hpp"

Blink::Blink(uint8_t pin) : _pin(pin) {
  pinMode(_pin, OUTPUT);
  off();
}

void Blink::on() {
  digitalWrite(_pin, LOW);  // LED is inverted: LOW = ON
  _state = true;
}

void Blink::off() {
  digitalWrite(_pin, HIGH);  // LED is inverted: HIGH = OFF
  _state = false;
}

void Blink::toggle() {
  if (_state) {
    off();
  } else {
    on();
  }
}

bool Blink::isActive()
{
  return _state;
}

void Blink::blink(uint32_t interval_ms, uint8_t times) {
  blinkPin(_pin, interval_ms, times);
}

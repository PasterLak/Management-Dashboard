#include "joystick.hpp"

extern "C" {}
#include "pins.hpp"
#include "../extentions/log.hpp"

Joystick::Joystick(uint8_t pinX, uint8_t pinY, uint8_t pinBtn)
    : _pinX(pinX),
      _pinY(pinY),
      _pinBtn(pinBtn),
      _valX(0),
      _valY(0),
      _btnState(false) {
  _calX = {1500, 200, false};
  _calY = {1500, 200, false};

  pinMode(pinX, INPUT);
  pinMode(pinY, INPUT);

  pinMode(_pinBtn, INPUT_PULLUP);
}

int8_t Joystick::mapAxis(uint16_t raw, const AxisCalibration& cal) {
  if (raw < (cal.center - cal.deadzone))
    return cal.inverted ? 1 : -1;
  if (raw > (cal.center + cal.deadzone))
    return cal.inverted ? -1 : 1;
  return 0;
}

void Joystick::update() {
  _valXRaw = (uint16_t)analogRead(_pinX);
  _valYRaw = (uint16_t)analogRead(_pinY);

  //Log::println("X ", _valXRaw);
  //Log::println("Y ", _valYRaw);


  _valX = mapAxis(_valXRaw, _calX);
  _valY = mapAxis(_valYRaw, _calY);

  _btnState = (digitalRead(_pinBtn) == LOW);
}

int8_t Joystick::getX() const { return _valX; }
int8_t Joystick::getY() const { return _valY; }
uint16_t Joystick::getXRaw() const { return _valXRaw; }
uint16_t Joystick::getYRaw() const { return _valYRaw; }
bool Joystick::isPressed() const { return _btnState; }
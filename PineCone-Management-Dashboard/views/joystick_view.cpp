#include "joystick_view.hpp"

extern "C" {}
#include "pins.hpp"

JoystickView::JoystickView(Joystick& joystick, PinsManager& pinsManager)
    : _joystick(joystick), _pinsManager(pinsManager) {}

void JoystickView::init() {
  _cachedX = 0;
  _cachedY = 0;
  
  _cachedBtnState = false;
  _pinsManager.registerPin(_joystick.getPinX(), "X", INPUT);
  _pinsManager.registerPin(_joystick.getPinY(), "Y", INPUT);
  setStringFromInt(_joystick.getPinX(), 0);
  setStringFromInt(_joystick.getPinY(), 0);

  _pinsManager.registerPin(_joystick.getPinBtn(), "Joy But", INPUT_PULLUP);
  _pinsManager.setValueString(_joystick.getPinBtn(), "0");
}

void JoystickView::setStringFromInt(uint8_t pin, int8_t val) {
  if (val > 0)
    _pinsManager.setValueString(pin, "1");
  else if (val < 0)
    _pinsManager.setValueString(pin, "-1");
  else
    _pinsManager.setValueString(pin, "0");
}

void JoystickView::update() {
  _joystick.update();

  int8_t newX = _joystick.getX();
  int8_t newY = _joystick.getY();

  if (newX != _cachedX) {
    setStringFromInt(_joystick.getPinX(), _joystick.getX());
    _cachedX = newX;
  }

  if (newY != _cachedY) {
    setStringFromInt(_joystick.getPinY(), _joystick.getY());
    _cachedY = newY;
  }

  bool newState = _joystick.isPressed();

  if (newState != _cachedBtnState) {
    if (newState)
      _pinsManager.setValueString(_joystick.getPinBtn(), "1");
    else
      _pinsManager.setValueString(_joystick.getPinBtn(), "0");
  }
}
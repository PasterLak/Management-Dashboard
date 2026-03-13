#pragma once
#include "components/pins_manager.hpp"
#include "joystick.hpp"

class JoystickView {
 public:
  JoystickView(Joystick& joystick, PinsManager& pinsManager);

  void init();
  void update();

 private:
  Joystick& _joystick;
  PinsManager& _pinsManager;
  int8_t _cachedX;
  int8_t _cachedY;
  bool _cachedBtnState;

  void setStringFromInt(uint8_t pin, int8_t val);
};
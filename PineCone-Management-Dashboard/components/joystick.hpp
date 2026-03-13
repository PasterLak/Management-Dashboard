#pragma once
#include <stdint.h>

struct AxisCalibration {
  uint16_t center;
  uint16_t deadzone;
  bool inverted;
};

class Joystick {
 public:
  Joystick(uint8_t pinX, uint8_t pinY, uint8_t pinBtn);

  void update();

  int8_t getX() const;
  int8_t getY() const;
  uint16_t getXRaw() const;
  uint16_t getYRaw() const;
  bool isPressed() const;

  uint8_t getPinX() const { return _pinX; }
  uint8_t getPinY() const { return _pinY; }
  uint8_t getPinBtn() const { return _pinBtn; }

 private:
  uint8_t _pinX;
  uint8_t _pinY;
  uint8_t _pinBtn;

  AxisCalibration _calX;
  AxisCalibration _calY;

  int8_t _valX;
  int8_t _valY;
  uint16_t _valXRaw;
  uint16_t _valYRaw;
  bool _btnState;

  int8_t mapAxis(uint16_t raw, const AxisCalibration& cal);
};
#pragma once

extern "C" {
    #include <stdint.h>
}

class Button
{
private:
    uint8_t _pin;
    bool state = false;
    bool lastState = false;
    bool lastStableState = false;
    uint64_t lastDebounceTime = 0;
    uint32_t debounceDelay = 5000;

public:
    Button(uint8_t pin);
    void update();
    bool isPressed();
    bool isDown();
    bool isUp();
    bool getState();
    bool getLastState();
    void setDebounceDelayUS(uint32_t delay_us);
    void setDebounceDelayMS(uint32_t delay_ms);
};
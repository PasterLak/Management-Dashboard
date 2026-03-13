
#pragma once

#include <stdint.h>

#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define INPUT_PULLDOWN 3

#define MAX_PINS 23

#define HIGH 1
#define LOW 0

void pinMode(uint8_t pin, uint8_t mode);
void digitalWrite(uint8_t pin, uint8_t value);
int digitalRead(uint8_t pin);
int analogRead(uint8_t pin);
void delay(unsigned long ms);

void togglePin(uint8_t pin);
void blinkPin(uint8_t pin, unsigned long delay_ms, uint8_t times);
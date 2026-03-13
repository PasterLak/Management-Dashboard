#include "delta_time.hpp"

extern "C" {
    #include <bl_timer.h>
    #include <stdio.h>
}

DeltaTime::DeltaTime() {
    oldTime_us = bl_timer_now_us64();
    currentDelta_us = 0;
    maxDelta_us = 0;
    minDelta_us = UINT32_MAX;
    totalDelta_us = 0;
    frameCount = 0;
    averageDelta_us = 0.0f;
}

void DeltaTime::update() {
    uint64_t currentTime = bl_timer_now_us64();

    if (currentTime >= oldTime_us)
        currentDelta_us = static_cast<uint32_t>(currentTime - oldTime_us);
    else
        currentDelta_us = static_cast<uint32_t>(
            (UINT64_MAX - oldTime_us) + currentTime + 1
        );

    oldTime_us = currentTime;

    if (currentDelta_us > maxDelta_us)
        maxDelta_us = currentDelta_us;

    if (currentDelta_us < minDelta_us)
        minDelta_us = currentDelta_us;

    totalDelta_us += currentDelta_us;
    frameCount++;

    if (frameCount >= 1000) {
        averageDelta_us = static_cast<float>(totalDelta_us) / static_cast<float>(frameCount);
        totalDelta_us = 0;
        frameCount = 0;
    }
}

uint32_t DeltaTime::getUs() const {
    return currentDelta_us;
}

float DeltaTime::getMs() const {
    return static_cast<float>(currentDelta_us) / 1000.0f;
}

float DeltaTime::getSec() const {
    return getMs() / 1000.0f;
}

float DeltaTime::getFps() const {
    if (currentDelta_us == 0) return 0.0f;
    return 1'000'000.0f / static_cast<float>(currentDelta_us);
}

uint32_t DeltaTime::getMaxUs() const {
    return maxDelta_us;
}

uint32_t DeltaTime::getMinUs() const {
    return minDelta_us == UINT32_MAX ? 0 : minDelta_us;
}

float DeltaTime::getAverageUs() const {
    return averageDelta_us;
}

float DeltaTime::getAverageMs() const {
    return averageDelta_us / 1000.0f;
}

void DeltaTime::getAsString(char* buffer, uint32_t bufferSize) const {
    snprintf(buffer, bufferSize, "Δ: %luus (%.1fms) FPS: %.1f", 
             static_cast<unsigned long>(currentDelta_us),
             getMs(),
             getFps());
}

void DeltaTime::resetStats() {
    maxDelta_us = 0;
    minDelta_us = UINT32_MAX;
    totalDelta_us = 0;
    frameCount = 0;
    averageDelta_us = 0.0f;
}

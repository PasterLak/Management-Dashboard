#pragma once

extern "C" {
    #include <stdint.h>
}

class DeltaTime {
private:
    uint64_t oldTime_us;
    uint32_t currentDelta_us;
    uint32_t maxDelta_us;
    uint32_t minDelta_us;
    uint64_t totalDelta_us;
    uint32_t frameCount;
    float averageDelta_us;

public:
    DeltaTime();

    void update();
    uint32_t getUs() const;
    float getMs() const;
    float getSec() const;
    float getFps() const;

    uint32_t getMaxUs() const;
    uint32_t getMinUs() const;

    float getAverageUs() const;
    float getAverageMs() const;

    void getAsString(char* buffer, uint32_t bufferSize) const;
    void resetStats();
};

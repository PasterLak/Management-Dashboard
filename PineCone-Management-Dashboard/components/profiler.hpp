#pragma once

extern "C" {
    #include <stdint.h>
}


class Profiler {
public:
    Profiler();
    void start();
    void end();
    uint32_t getUs() const;
    float getMs() const;
    float getSec() const;
    void printTime() const;

private:
    uint64_t startTime_us;
    uint64_t endTime_us;
    uint32_t elapsed_us;

};

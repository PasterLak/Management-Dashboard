#pragma once

#include "../extentions/event.hpp"

int globalTimerTicks = 0;
int sensorReads = 0;

#define TEST_ASSERT(condition, test_id) \
    if (!(condition)) { \
        Log::println("TEST FAILED AT ID: {}", test_id); \
        return; \
    }

void onTimerTick(int delta)
{
    globalTimerTicks += delta;
}

class HumiditySensor
{
public:
    int totalHumidity = 0;
    Event<int>* targetEvent = nullptr;

    void onData(int value)
    {
        totalHumidity += value;
        sensorReads++;
    }

    void onDataAndSleep(int value)
    {
        totalHumidity += value;
        if (targetEvent != nullptr)
        {
            *targetEvent -= {this, &HumiditySensor::onDataAndSleep};
        }
    }
};

inline void runEventTests()
{
    globalTimerTicks = 0;
    sensorReads = 0;

    Event<int> timerEvent(2);
    
    timerEvent += onTimerTick;
    timerEvent.invoke(5);
    TEST_ASSERT(globalTimerTicks == 5, 1);

    HumiditySensor sensor;
    timerEvent += {&sensor, &HumiditySensor::onData};
    timerEvent.invoke(10);
    TEST_ASSERT(globalTimerTicks == 15, 2);
    TEST_ASSERT(sensor.totalHumidity == 10, 3);
    TEST_ASSERT(sensorReads == 1, 4);

    timerEvent += onTimerTick;
    
    int prevTicks = globalTimerTicks;
    int prevHumidity = sensor.totalHumidity;
    timerEvent.invoke(1);
    TEST_ASSERT(globalTimerTicks == prevTicks + 1, 5);
    TEST_ASSERT(sensor.totalHumidity == prevHumidity + 1, 6);

    timerEvent -= onTimerTick;
    timerEvent.invoke(5);
    TEST_ASSERT(globalTimerTicks == 16, 7);
    TEST_ASSERT(sensor.totalHumidity == 16, 8);

    timerEvent.clear();
    timerEvent.invoke(100);
    TEST_ASSERT(globalTimerTicks == 16, 9);
    TEST_ASSERT(sensor.totalHumidity == 16, 10);

    Event<int> isrEvent(3);
    sensor.totalHumidity = 0;
    sensor.targetEvent = &isrEvent;

    isrEvent += {&sensor, &HumiditySensor::onDataAndSleep};
    isrEvent += {&sensor, &HumiditySensor::onData};

    isrEvent.invoke(10);
    TEST_ASSERT(sensor.totalHumidity == 20, 11);

    isrEvent.invoke(10);
    TEST_ASSERT(sensor.totalHumidity == 30, 12);

    Log::println("BL602 bare-metal Event tests passed successfully!");
}
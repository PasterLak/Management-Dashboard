/*


void turnOnGreenLed()
{
    Log::println("Hardware: Green LED is ON");
}

class NetworkManager
{
public:
    void fetchUpdates()
    {
        Log::println("System: Checking for updates over WiFi");
    }
};

void displayDamage(int amount)
{
    Log::println("UI: -{} HP", amount);
}

class Player
{
public:
    void applyDamage(int amount)
    {
        Log::println("Player: Health decreased by {}", amount);
    }
};

void runExamples()
{
    Event onConnected(2);
    NetworkManager network;

    onConnected += turnOnGreenLed;
    onConnected += {&network, &NetworkManager::fetchUpdates};

    onConnected.invoke();

    onConnected -= turnOnGreenLed;


    Event<int> onHit(2);
    Player player;

    onHit += displayDamage;
    onHit += {&player, &Player::applyDamage};

    onHit.invoke(45);
}

*/


#pragma once

#include <stddef.h>

template <typename... Args>
class Event
{
private:
    struct Handler
    {
        void* instance = nullptr;
        void (*freeFunc)(Args...) = nullptr;
        void (*invoker)(const Handler&, Args...) = nullptr;
        unsigned char methodData[24] = {};
        bool active = true;

        bool operator==(const Handler& other) const
        {
            if (freeFunc != nullptr && freeFunc == other.freeFunc)
            {
                return true;
            }
            if (instance != nullptr && instance == other.instance)
            {
                for (size_t i = 0; i < sizeof(methodData); ++i)
                {
                    if (methodData[i] != other.methodData[i])
                    {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }
    };

    Handler* handlers;
    size_t capacity;
    size_t count;
    int invokeCount;

    static void copyData(unsigned char* dest, const void* src, size_t size)
    {
        const unsigned char* s = static_cast<const unsigned char*>(src);
        for (size_t i = 0; i < size; ++i)
        {
            dest[i] = s[i];
        }
    }

    template <typename T>
    static void methodInvoker(const Handler& handler, Args... args)
    {
        if (!handler.active) return;
        T* obj = static_cast<T*>(handler.instance);
        void (T::*m)(Args...);
        
        unsigned char* dest = reinterpret_cast<unsigned char*>(&m);
        for (size_t i = 0; i < sizeof(m); ++i)
        {
            dest[i] = handler.methodData[i];
        }
        
        (obj->*m)(args...);
    }

    static void freeFuncInvoker(const Handler& handler, Args... args)
    {
        if (!handler.active) return;
        handler.freeFunc(args...);
    }

    void cleanup()
    {
        size_t newCount = 0;
        for (size_t i = 0; i < count; ++i)
        {
            if (handlers[i].active)
            {
                if (i != newCount)
                {
                    handlers[newCount] = handlers[i];
                }
                newCount++;
            }
        }
        count = newCount;
    }

public:
    Event(size_t maxHandlers) : capacity(maxHandlers), count(0), invokeCount(0)
    {
        handlers = new Handler[capacity];
    }

    ~Event()
    {
        delete[] handlers;
    }

    struct MethodTarget
    {
        void* instance = nullptr;
        unsigned char methodData[24] = {};
        void (*invoker)(const Handler&, Args...) = nullptr;

        template <typename T>
        MethodTarget(T* inst, void (T::*meth)(Args...)) : instance(inst)
        {
            const unsigned char* src = reinterpret_cast<const unsigned char*>(&meth);
            for (size_t i = 0; i < sizeof(meth); ++i)
            {
                methodData[i] = src[i];
            }
            invoker = &Event<Args...>::template methodInvoker<T>;
        }
    };

    template <typename T>
    void add(T* instance, void (T::*method)(Args...))
    {
        if (count >= capacity) return;
        
        Handler h;
        h.instance = instance;
        copyData(h.methodData, &method, sizeof(method));
        h.invoker = &methodInvoker<T>;
        handlers[count++] = h;
    }

    template <typename T>
    void remove(T* instance, void (T::*method)(Args...))
    {
        Handler h;
        h.instance = instance;
        copyData(h.methodData, &method, sizeof(method));
        
        for (size_t i = 0; i < count; ++i)
        {
            if (handlers[i] == h)
            {
                handlers[i].active = false;
                break;
            }
        }
        if (invokeCount == 0) cleanup();
    }

    void add(void (*function)(Args...))
    {
        if (count >= capacity) return;

        Handler h;
        h.freeFunc = function;
        h.invoker = &freeFuncInvoker;
        handlers[count++] = h;
    }

    void remove(void (*function)(Args...))
    {
        Handler h;
        h.freeFunc = function;
        
        for (size_t i = 0; i < count; ++i)
        {
            if (handlers[i] == h)
            {
                handlers[i].active = false;
                break;
            }
        }
        if (invokeCount == 0) cleanup();
    }

    void operator+=(const MethodTarget& target)
    {
        if (count >= capacity) return;

        Handler h;
        h.instance = target.instance;
        for (size_t i = 0; i < sizeof(target.methodData); ++i)
        {
            h.methodData[i] = target.methodData[i];
        }
        h.invoker = target.invoker;
        handlers[count++] = h;
    }

    void operator-=(const MethodTarget& target)
    {
        Handler h;
        h.instance = target.instance;
        for (size_t i = 0; i < sizeof(target.methodData); ++i)
        {
            h.methodData[i] = target.methodData[i];
        }
        
        for (size_t i = 0; i < count; ++i)
        {
            if (handlers[i] == h)
            {
                handlers[i].active = false;
                break;
            }
        }
        if (invokeCount == 0) cleanup();
    }

    void operator+=(void (*function)(Args...))
    {
        add(function);
    }

    void operator-=(void (*function)(Args...))
    {
        remove(function);
    }

    void clear()
    {
        for (size_t i = 0; i < count; ++i)
        {
            handlers[i].active = false;
        }
        if (invokeCount == 0) cleanup();
    }

    void invoke(Args... args)
    {
        invokeCount++;
        for (size_t i = 0; i < count; ++i)
        {
            if (handlers[i].active)
            {
                handlers[i].invoker(handlers[i], args...);
            }
        }
        invokeCount--;
        
        if (invokeCount == 0) cleanup();
    }

    Event(const Event&) = delete;
    Event& operator=(const Event&) = delete;
};
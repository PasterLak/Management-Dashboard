extern "C" {
#include <FreeRTOS.h>
#include <bl_uart.h>
#include <hal_gpio.h>
#include <hal_uart.h>
#include <lwip/tcpip.h>
#include <stdio.h>
#include <task.h>
void vInitializeBL602(void);
}

#include "program.hpp"

constexpr uint16_t APP_STACK_SIZE = 4096;
constinit static StackType_t app_stack[APP_STACK_SIZE]{};
constinit static StaticTask_t app_task_handle{};

extern "C" void bfl_main(void) {
  // Initialize the default UART for communication.
  // Pins 16 (TX) and 7 (RX), Baudrate 2,000,000
  bl_uart_init(0,                 // UART channel (o = USB port)
               16,                // transmission pin
               7,                 // receive pin
               255, 255,          // unused
               2 * 1000 * 1000);  // baud rate

  vInitializeBL602();

  xTaskCreateStatic(task_app_wrapper, "app", APP_STACK_SIZE, nullptr, 16,
                    app_stack, &app_task_handle);

  tcpip_init(nullptr, nullptr);

  vTaskStartScheduler();
}

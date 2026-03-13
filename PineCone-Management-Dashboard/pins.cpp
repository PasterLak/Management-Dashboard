#include "pins.hpp"

extern "C" {
#include <FreeRTOS.h>
#include <task.h>
#include <bl_gpio.h>
#include <bl_adc.h>
#include <bl602_adc.h>
#include <bl602_glb.h>
#include <bl602_common.h>
}

#define MAX_GPIO_PINS 24

static bool _adc_initialized = false;

static void ensure_adc_init(void) {
    if (_adc_initialized) return;

    GLB_Set_ADC_CLK(ENABLE, GLB_ADC_CLK_96M, 1);

    ADC_CFG_Type adcCfg = {
        .v18Sel = ADC_V18_SEL_1P82V,
        .v11Sel = ADC_V11_SEL_1P1V,
        .clkDiv = ADC_CLK_DIV_32,
        .gain1 = ADC_PGA_GAIN_NONE,
        .gain2 = ADC_PGA_GAIN_NONE,
        .chopMode = ADC_CHOP_MOD_AZ_PGA_ON,
        .biasSel = ADC_BIAS_SEL_MAIN_BANDGAP,
        .vcm = ADC_PGA_VCM_1V,
        .vref = ADC_VREF_3P2V,
        .inputMode = ADC_INPUT_SINGLE_END,
        .resWidth = ADC_DATA_WIDTH_16_WITH_64_AVERAGE,
        .offsetCalibEn = DISABLE,
        .offsetCalibVal = 0
    };

    ADC_Init(&adcCfg);
    ADC_FIFO_Cfg_Type fifoCfg = { .fifoThreshold = ADC_FIFO_THRESHOLD_1, .dmaEn = DISABLE };
    ADC_FIFO_Cfg(&fifoCfg);
    ADC_Enable();
    _adc_initialized = true;
}

void pinMode(uint8_t pin, uint8_t mode) {
    if (pin >= MAX_GPIO_PINS) return;
    switch (mode) {
        case OUTPUT: bl_gpio_enable_output(pin, 0, 0); break;
        case INPUT: bl_gpio_enable_input(pin, 0, 0); break;
        case INPUT_PULLUP: bl_gpio_enable_input(pin, 1, 0); break;
        case INPUT_PULLDOWN: bl_gpio_enable_input(pin, 0, 1); break;
        default: return;

    }
}

void digitalWrite(uint8_t pin, uint8_t value) {
    if (pin >= MAX_GPIO_PINS) return;
    bl_gpio_output_set(pin, value);
}

int digitalRead(uint8_t pin) {
    if (pin >= MAX_GPIO_PINS) return 0;
    return bl_gpio_input_get_value(pin);
}

int analogRead(uint8_t pin) {
    ensure_adc_init();

    int channel = -1;
    switch(pin) {
        case 4:  channel = 1; break;
        case 5:  channel = 4; break;
        case 6:  channel = 5; break;
        case 12: channel = 0; break;
        case 13: channel = 3; break;
        case 14: channel = 2; break;
        default: return 0;
    }

    GLB_GPIO_Type gpio_pin = (GLB_GPIO_Type)pin;
    GLB_GPIO_Func_Init(GPIO_FUN_ANALOG, &gpio_pin, 1);
    ADC_Channel_Config((ADC_Chan_Type)channel, ADC_CHAN_GND, DISABLE);

    int cleanup = 20;
    while(ADC_Get_FIFO_Count() > 0 && cleanup > 0) {
        ADC_Read_FIFO();
        cleanup--;
    }

    ADC_Start();

    int timeout = 50;
    while(ADC_Get_FIFO_Count() == 0) {
        vTaskDelay(1);
        timeout--;
        if (timeout <= 0) return 0;
    };

    uint32_t regVal = ADC_Read_FIFO();
    ADC_Result_Type result;
    ADC_Parse_Result(&regVal, 1, &result);

    return (int)(result.volt * 1000);
}

void delay(unsigned long ms) {
    vTaskDelay(pdMS_TO_TICKS(ms));
}

void togglePin(uint8_t pin) {
    digitalWrite(pin, !digitalRead(pin));
}

void blinkPin(uint8_t pin, unsigned long delay_ms, uint8_t times) {
    for (uint8_t i = 0; i < times; i++) {
        digitalWrite(pin, HIGH);
        delay(delay_ms);
        digitalWrite(pin, LOW);
        if (i < times - 1) delay(delay_ms);
    }
}
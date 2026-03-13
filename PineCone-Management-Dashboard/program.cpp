#include "program.hpp"

extern "C" {
#include <FreeRTOS.h>
#include <bl_timer.h>
#include <lwip/tcpip.h>
#include <stdio.h>
#include <task.h>

void* __dso_handle = nullptr;
}

#include "pins.hpp"
#include <etl/string.h>
#include "playground.hpp"
#include "components/dashboard_manager.hpp"
#include "networking/http_dashboard_client.hpp"
#include "networking/mqtt_dashboard_client.hpp"
#include "components/joystick.hpp"
#include "views/joystick_view.hpp"
#include "views/led_view.hpp"
#include "components/pins_manager.hpp"
#include "networking/wifi_handler.hpp"
#include "components/delta_time.hpp"
#include "extentions/log.hpp"
#include "include/config.hpp"



DeltaTime deltaTime;
PinsManager pinsManager;  
WIFIHandler wifi(Config::WIFI::SSID, Config::WIFI::PASSWORD);

#if USE_MQTT
MqttDashboardClient dashboardClient( Config::MQTT::USER ,Config::MQTT::PASSWORD  ,
  Config::MQTT::PUB_TOPIC , Config::MQTT::SUB_TOPIC);
#else
HttpDashboardClient dashboardClient;
#endif

LEDView ledController(Config::LED::PIN, Config::LED::BLINK_INTERVAL_SEC, pinsManager);
DashboardManager dashboardManager(wifi, dashboardClient, pinsManager, 
                                  Config::DASHBOARD_SERVER_IP,
                                  Config::DASHBOARD_SERVER_PORT,
                                  Config::DASHBOARD_UPDATE_INTERVAL_SEC);

Joystick joystick(4,5,6);   
JoystickView joystickView(joystick, pinsManager);

void task_app_wrapper(void* pvParameters) {
  (void)pvParameters;
  vTaskDelay(pdMS_TO_TICKS(100));

  runPlayground(deltaTime, false);
  start();

  while (1) {
    loop();
  }
}

void start() {
  Log::println("====== PINECONE BL602 STARTED! ======");
  Log::println("====== BUILD:", Config::BUILD_VERSION, "======");

  ledController.initialize();
  joystickView.init();
  
  wifi.setDebugEnabled(false);
  dashboardManager.setDebugEnabled(false);
  
  wifi.start();
  #if USE_MQTT
    // update subscribe topic with mac/id to identify the specific PineCone
    etl::string<64> fullSubTopic(Config::MQTT::SUB_TOPIC);
    fullSubTopic.append("/");
    fullSubTopic.append(wifi.getMacAdressAsString());

    dashboardClient.setMQTTSubScribeTopic(fullSubTopic);
  #endif
}

void loop() {
  deltaTime.update();
  joystickView.update();
  float delta_sec = deltaTime.getSec();

  bool is_connected = dashboardManager.update(delta_sec);
  bool should_blink = dashboardManager.shouldBlink();

  ledController.update(is_connected, should_blink, delta_sec);
}
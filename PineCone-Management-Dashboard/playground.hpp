#include "extentions/log.hpp"
#include "pins.hpp"
#include "components/delta_time.hpp"
#include "components/joystick.hpp"
#include "tests/event_test.hpp"


void testJoystick(DeltaTime dt)
{

  float time = 0;
  Joystick joystick(4,5,6);

  runEventTests();


  while (true) {
    dt.update();
    time += dt.getSec();

    if (time > 0.2f) {
      
      joystick.update();

      auto x = joystick.getX();
      auto y = joystick.getY();


      Log::println("X: ", x);
      Log::println("Y: ", y);

      time = 0;
    }
  }
}

void runPlayground(DeltaTime dt, bool isActive) {

  if(!isActive) return;
 
  testJoystick(dt);
}
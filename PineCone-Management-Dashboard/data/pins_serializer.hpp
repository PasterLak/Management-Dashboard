#pragma once

#include <stddef.h>

#include "i_pins_formatter.hpp"
#include "pins_manager.hpp"

class PinsSerializer {
 public:
  explicit PinsSerializer(IPinsFormatter& formatter);

  void serialize(const PinsManager& pinsManager, char* buffer,
                 size_t buffer_size);

 private:
  IPinsFormatter& formatter_;
};
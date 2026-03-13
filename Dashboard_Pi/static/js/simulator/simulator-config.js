// Configuration constants for simulators
// Contains defaults, CSS classes, and example JSON payloads
class SimulatorConfig {
  // Default values
  static DEFAULTS = {
    INTERVAL: 10,
    POLL_INTERVAL: 20,
    AUTO_UPDATE: true
  };

  // CSS classes
  static CSS_CLASSES = {
    CARD: 'simulator-card',
    RUNNING: 'sim-status--running',
    STOPPED: 'sim-status--stopped',
    VISIBLE: 'visible',
    ACTIVE: 'active',
    SHOW: 'show'
  };

  // Field identifiers
  static FIELDS = {
    NAME: 'name',
    INTERVAL: 'interval',
    JSON: 'json',
    AUTO_UPDATE: 'autoUpdate'
  };

  // Actions
  static ACTIONS = {
    START: 'start',
    STOP: 'stop',
    SEND: 'send',
    CLEAR: 'clear',
    REMOVE: 'remove',
    APPROVE_JSON: 'approve-json',
    DISCARD_JSON: 'discard-json'
  };

  // API endpoints
  static API = {
    START: '/api/simulator/start',
    STOP: '/api/simulator/stop',
    SEND: '/api/simulator/send',
    STATUS: '/api/simulator/status',
    UPDATE: '/api/simulator/update'
  };

  // Example payloads
  static EXAMPLES = {
    button: {
      id: "PineCone_001",
      d: "Button Device",
      p: {
        GPIO0: { n: "button", m: "pullup", v: "1" }
      }
    },
    led: {
      id: "PineCone_002",
      d: "LED Controller",
      p: {
        GPIO1: { n: "led_red", m: "output", v: "0" },
        GPIO2: { n: "led_green", m: "output", v: "1" },
        GPIO3: { n: "led_blue", m: "output", v: "0" }
      }
    },
    sensor: {
      id: "PineCone_003",
      d: "Sensor Module",
      p: {
        GPIO4: { n: "temp_sensor", m: "input", v: "23" },
        GPIO5: { n: "motion_detect", m: "pulldown", v: "0" }
      }
    },
    joystick: {
      id: "PineCone_Joystick_001",
      d: "Joystick Controller",
      p: {
        GPIO11: { n: "LED", m: "output", v: "1" },
        GPIO4: { n: "X", m: "input", v: "0" },
        GPIO5: { n: "Y", m: "input", v: "0" },
        GPIO6: { n: "Joystick Button", m: "input", v: "1" }
      }
    }

  };

  // Get example by type
  static getExample(type) {
    return this.EXAMPLES[type] || null;
  }

  // Get available example types
  static getExampleTypes() {
    return Object.keys(this.EXAMPLES);
  }
}

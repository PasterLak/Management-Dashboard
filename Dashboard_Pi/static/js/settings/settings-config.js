// Defines all available settings and their constraints
// Contains field IDs, min/max values, defaults, and descriptions
class SettingsConfig {
  static FIELDS = {
    pollInterval: {
      id: 'pollIntervalInput',
      min: 10,
      default: 50,
      name: 'Device Polling Interval',
      description: 'How often the dashboard fetches device data from the server (device table updates)'
    },
    tickOffline: {
      id: 'tickOfflineInput',
      min: 100,
      default: 1000,
      name: 'Offline Check Interval',
      description: 'How often the dashboard checks if devices have exceeded the offline threshold'
    },
    offlineThreshold: {
      id: 'offlineThresholdInput',
      min: 100,
      default: 5000,
      name: 'Offline Threshold',
      description: 'Time of inactivity before a device is marked as offline (no heartbeat received)'
    },
    simulatorPoll: {
      id: 'simulatorPollInput',
      min: 100,
      default: 500,
      name: 'Simulator Polling Interval',
      description: 'How often the dashboard fetches new responses from running simulators'
    },
    consolePoll: {
      id: 'consolePollInput',
      min: 100,
      default: 500,
      name: 'Console Polling Interval',
      description: 'How often the Console tab fetches new server logs (Flask terminal output)'
    },
    maxConsoleLines: {
      id: 'maxConsoleLinesInput',
      min: 100,
      max: 10000,
      default: 1000,
      name: 'Max Console Lines',
      description: 'Maximum number of log lines to keep in the Console tab (older logs are removed)'
    },
    maxSimulatorResponses: {
      id: 'maxSimulatorResponsesInput',
      min: 10,
      max: 500,
      default: 100,
      name: 'Max Simulator Responses',
      description: 'Maximum number of responses to display per simulator (server-side limit)'
    }
  };

  // Returns all field names
  static getFieldNames() {
    return Object.keys(this.FIELDS);
  }

  // Returns default values
  static getDefaults() {
    const defaults = {};
    for (const [key, config] of Object.entries(this.FIELDS)) {
      defaults[key] = config.default;
    }
    return defaults;
  }

  // Returns validation rule for a field
  static getValidationRule(fieldName) {
    const field = this.FIELDS[fieldName];
    if (!field) return null;
    
    return {
      min: field.min,
      max: field.max,
      name: field.name
    };
  }
}

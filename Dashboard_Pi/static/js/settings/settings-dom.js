// Finds and caches all DOM elements for the settings page
// Provides getter/setter methods for form inputs and buttons
class SettingsDOM {
  constructor() {
    this.inputs = {};
    this.buttons = {};
    this._initializeElements();
  }

  // Initializes all DOM elements
  _initializeElements() {
    // Load input fields
    for (const [fieldName, config] of Object.entries(SettingsConfig.FIELDS)) {
      this.inputs[fieldName] = document.getElementById(config.id);
    }

    // Load buttons
    this.buttons.save = document.getElementById('saveSettingsBtn');
    this.buttons.reset = document.getElementById('resetSettingsBtn');
  }

  // Checks if DOM elements are available
  isAvailable() {
    return Object.values(this.inputs).some(el => el !== null);
  }

  // Returns an input element
  getInput(fieldName) {
    return this.inputs[fieldName];
  }

  // Returns all input elements
  getAllInputs() {
    return Object.values(this.inputs).filter(el => el !== null);
  }

  // Returns a button element
  getButton(buttonName) {
    return this.buttons[buttonName];
  }

  // Reads value from input field
  getValue(fieldName) {
    const input = this.getInput(fieldName);
    return input ? parseInt(input.value, 10) : null;
  }

  // Sets value in input field
  setValue(fieldName, value) {
    const input = this.getInput(fieldName);
    if (input) {
      input.value = value;
    }
  }

  // Sets all values at once
  setAllValues(values) {
    for (const [fieldName, value] of Object.entries(values)) {
      this.setValue(fieldName, value);
    }
  }
}

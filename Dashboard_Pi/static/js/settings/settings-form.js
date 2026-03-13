// Manages form state for the settings page
// Loads values from storage and extracts current form data
class SettingsForm {
  constructor(dom, settingsManager) {
    this.dom = dom;
    this.settings = settingsManager;
  }

  // Loads current settings into the form
  loadValues() {
    if (!this.dom.isAvailable()) return;

    const values = this._getValuesFromSettings();
    this.dom.setAllValues(values);
  }

  // Gets current form values
  getCurrentValues() {
    const values = {};
    
    for (const fieldName of SettingsConfig.getFieldNames()) {
      const value = this.dom.getValue(fieldName);
      const defaultValue = SettingsConfig.FIELDS[fieldName].default;
      values[fieldName] = value || defaultValue;
    }

    return values;
  }

  // Resets form to defaults
  applyDefaults() {
    const defaults = SettingsConfig.getDefaults();
    this.dom.setAllValues(defaults);
    return defaults;
  }

  // Gets values from the Settings Manager
  _getValuesFromSettings() {
    const values = {};
    
    for (const fieldName of SettingsConfig.getFieldNames()) {
      values[fieldName] = this.settings.get(fieldName);
    }

    return values;
  }
}

// Executes save and reset operations for settings
// Validates input, saves to storage, and broadcasts changes
class SettingsActions {
  constructor(form, validator, settingsManager, buttonFeedback) {
    this.form = form;
    this.validator = validator;
    this.settings = settingsManager;
    this.buttonFeedback = buttonFeedback;
  }

  // Saves settings
  async save(saveButton) {
    try {
      // Get values from form
      const values = this.form.getCurrentValues();

      // Validate
      if (!this.validator.validate(values)) {
        return;
      }

      // Save
      this.settings.update(values);

      // Show feedback
      this.buttonFeedback.showTextFeedback(saveButton, 'Saved!');

    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings!');
    }
  }

  // Resets settings to defaults
  async reset(resetButton) {
    const defaults = this.form.applyDefaults();
    this.settings.update(defaults);
    this.buttonFeedback.showTextFeedback(resetButton, 'Reset successful!', {
      resetBorder: true
    });
  }
}

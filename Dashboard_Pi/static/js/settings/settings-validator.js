// Validates user input on the settings form
// Checks if values are numbers and within allowed min/max ranges
class SettingsValidator {
  // Validates all values
  validate(values) {
    for (const [fieldName, value] of Object.entries(values)) {
      const error = this.validateField(fieldName, value);
      if (error) {
        alert(error);
        return false;
      }
    }
    return true;
  }

  // Validates a single field
  validateField(fieldName, value) {
    const rule = SettingsConfig.getValidationRule(fieldName);
    if (!rule) return null;

    // Check if value is a valid number
    if (!this._isValidNumber(value)) {
      return `${rule.name} must be a valid number!`;
    }

    // Check minimum
    if (value < rule.min) {
      return `${rule.name} must be at least ${rule.min} ms!`;
    }
    
    // Check maximum if defined
    if (rule.max !== undefined && value > rule.max) {
      return `${rule.name} cannot exceed ${rule.max}!`;
    }

    return null; // No error
  }

  // Checks if value is a valid number
  _isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value) && value >= 0;
  }
}

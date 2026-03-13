// Shows temporary visual feedback on buttons (like "Saved!" or "Error")
// Automatically restores the original button text/icon after a few seconds
class ButtonFeedback {
  static DURATION = 2000;
  static SUCCESS_COLOR = 'var(--color-success)';
  static ERROR_COLOR = 'var(--color-danger)';

  constructor() {
    this.activeTimeouts = new WeakMap();
    this.originalStates = new WeakMap();
  }

  // Change button text temporarily (e.g., "Save" → "Saved!" → "Save")
  showTextFeedback(button, text, options = {}) {
    if (!button) return;

    // Clear any existing timeout
    if (this.activeTimeouts.has(button)) {
      clearTimeout(this.activeTimeouts.get(button));
    }

    const {
      bgColor = ButtonFeedback.SUCCESS_COLOR,
      textColor = 'var(--color-white)',
      duration = ButtonFeedback.DURATION,
      resetBorder = false
    } = options;

    const span = button.querySelector('span');
    if (!span) return;

    // Save original values only if not already saved
    if (!this.originalStates.has(button)) {
      this.originalStates.set(button, {
        text: span.textContent,
        bg: button.style.background,
        border: button.style.borderColor,
        color: button.style.color
      });
    }

    const original = this.originalStates.get(button);

    // Show feedback
    span.textContent = text;
    button.style.background = bgColor;
    button.style.color = textColor;

    if (resetBorder) {
      button.style.borderColor = bgColor;
    }

    // Reset after timeout
    const timeoutId = setTimeout(() => {
      span.textContent = original.text;
      button.style.background = original.bg;
      button.style.color = original.color;
      
      if (resetBorder) {
        button.style.borderColor = original.border;
      }

      this.activeTimeouts.delete(button);
      this.originalStates.delete(button);
    }, duration);

    this.activeTimeouts.set(button, timeoutId);
  }

  // Change button icon temporarily (e.g., save icon → checkmark icon → save icon)
  showIconFeedback(button, newIcon, options = {}) {
    if (!button) return;

    // Clear any existing timeout
    if (this.activeTimeouts.has(button)) {
      clearTimeout(this.activeTimeouts.get(button));
    }

    const {
      bgColor = ButtonFeedback.SUCCESS_COLOR,
      duration = ButtonFeedback.DURATION
    } = options;

    // Find the icon element
    let iconElement = button.querySelector('i') || button.querySelector('svg');
    
    if (!iconElement) return;

    // Save original values only if not already saved
    if (!this.originalStates.has(button)) {
      // Try to get original icon from data attribute first
      let originalIconName = button.getAttribute('data-original-icon');
      
      // Fallback to reading from the icon element
      if (!originalIconName) {
        originalIconName = iconElement.getAttribute('data-feather');
      }
      
      this.originalStates.set(button, {
        icon: originalIconName,
        bg: button.style.background,
        border: button.style.borderColor,
        shadow: button.style.boxShadow
      });
    }

    const original = this.originalStates.get(button);

    // Set new icon and colors
    iconElement.setAttribute('data-feather', newIcon);
    button.style.background = bgColor;
    button.style.borderColor = bgColor;
    button.style.boxShadow = 'none';
    if (window.feather) feather.replace();

    // Reset after timeout
    const timeoutId = setTimeout(() => {
      const currentIconElement = button.querySelector('i') || button.querySelector('svg');
      if (currentIconElement && original.icon) {
        currentIconElement.setAttribute('data-feather', original.icon);
        button.style.background = original.bg;
        button.style.borderColor = original.border;
        button.style.boxShadow = original.shadow;
        if (window.feather) feather.replace();
      }

      this.activeTimeouts.delete(button);
      this.originalStates.delete(button);
    }, duration);

    this.activeTimeouts.set(button, timeoutId);
  }

  /**
   * Show success feedback
   */
  showSuccess(button, options = {}) {
    if (button.querySelector('i') || button.querySelector('svg')) {
      this.showIconFeedback(button, 'check', {
        bgColor: ButtonFeedback.SUCCESS_COLOR,
        ...options
      });
    } else if (button.querySelector('span')) {
      this.showTextFeedback(button, options.text || 'Success!', {
        bgColor: ButtonFeedback.SUCCESS_COLOR,
        ...options
      });
    }
  }

  /**
   * Show error feedback
   */
  showError(button, options = {}) {
    if (button.querySelector('i') || button.querySelector('svg')) {
      this.showIconFeedback(button, 'x', {
        bgColor: ButtonFeedback.ERROR_COLOR,
        ...options
      });
    } else if (button.querySelector('span')) {
      this.showTextFeedback(button, options.text || 'Error!', {
        bgColor: ButtonFeedback.ERROR_COLOR,
        ...options
      });
    }
  }
}

// Coordinates the settings page components
// Connects form, validation, actions, and DOM elements together
class SettingsUIManager {
  constructor(settingsManager) {
    // Initialize DOM handler
    this.dom = new SettingsDOM();
    
    // Initialize services
    this.validator = new SettingsValidator();
    this.buttonFeedback = new ButtonFeedback();
    this.form = new SettingsForm(this.dom, settingsManager);
    this.actions = new SettingsActions(
      this.form,
      this.validator,
      settingsManager,
      this.buttonFeedback
    );
  }

  // Initializes the UI Manager
  init() {
    if (!this.dom.isAvailable()) {
      return;
    }

    this.form.loadValues();
    this._setupEventHandlers();
  }

  // Sets up event handlers
  _setupEventHandlers() {
    const saveBtn = this.dom.getButton('save');
    const resetBtn = this.dom.getButton('reset');

    if (!saveBtn) return;

    // Save-Button
    saveBtn.addEventListener('click', () => {
      this.actions.save(saveBtn);
    });

    // Reset-Button
    resetBtn.addEventListener('click', () => {
      this.actions.reset(resetBtn);
    });

    // Enter key to save
    this._setupKeyboardShortcuts(saveBtn);

    // Numeric validation
    this._setupNumericValidation();

    // Endpoint copy buttons
    this._setupEndpointCopyButtons();
  }

  // Sets up copy buttons for local dashboard endpoints
  _setupEndpointCopyButtons() {
    const copyButtons = document.querySelectorAll('.endpoint-copy');

    copyButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const text = button.dataset.copyText;
        if (!text || typeof ClipboardUtils === 'undefined') return;

        const success = await ClipboardUtils.copy(text);
        if (success) {
          this.buttonFeedback.showTextFeedback(button, 'Copied!', {
            bgColor: 'var(--color-success)',
            duration: 1500,
            resetBorder: true
          });
        } else {
          this.buttonFeedback.showTextFeedback(button, 'Error', {
            bgColor: 'var(--color-danger)',
            duration: 1500,
            resetBorder: true
          });
        }
      });
    });
  }

  // Sets up keyboard shortcuts
  _setupKeyboardShortcuts(saveBtn) {
    const inputs = this.dom.getAllInputs();

    inputs.forEach(input => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          this.actions.save(saveBtn);
        }
      });
    });
  }

  // Sets up numeric validation
  _setupNumericValidation() {
    const inputs = this.dom.getAllInputs();
    
    // If external validation exists, use it   
    if (typeof setupNumericInputValidation === 'function') {
      setupNumericInputValidation(inputs);
    }
  }
}

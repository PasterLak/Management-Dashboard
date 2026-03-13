// Makes sure numeric input fields only accept numbers (no letters or special characters)
// Also handles paste events to strip non-numeric characters

// Validate specific input elements
function setupNumericInputValidation(inputs) {
  inputs.forEach(input => {
    // Prevent non-numeric input
    input.addEventListener('keypress', (e) => {
      const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
      if (!allowedKeys.includes(e.key) && e.key !== 'Enter') {
        e.preventDefault();
      }
    });

    // Handle paste - strip non-numeric characters
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      const numericOnly = pastedText.replace(/\D/g, '');
      if (numericOnly) {
        input.value = numericOnly;
        // Trigger input event to notify listeners
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });
}

// Validate dynamically created inputs by their data-field attribute
function setupNumericInputValidationByField(fieldSelector) {
  // Prevent non-numeric input
  document.addEventListener('keypress', (e) => {
    const target = e.target;
    if (target.dataset.field === fieldSelector) {
      const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
      if (!allowedKeys.includes(e.key) && e.key !== 'Enter') {
        e.preventDefault();
      }
    }
  });

  // Handle paste - strip non-numeric characters
  document.addEventListener('paste', (e) => {
    const target = e.target;
    if (target.dataset.field === fieldSelector) {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      const numericOnly = pastedText.replace(/\D/g, '');
      if (numericOnly) {
        target.value = numericOnly;
        // Trigger input event to save
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
}

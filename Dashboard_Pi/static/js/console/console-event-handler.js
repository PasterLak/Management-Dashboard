// Handles user interactions on the console page
// Wires up clear button, scroll button, and auto-scroll detection
const ConsoleEventHandler = {
  apiService: null,

  init(apiService) {
    this.apiService = apiService;
    this.attachClearButton();
    this.attachScrollButton();
    this.attachScrollListener();
  },

  attachClearButton() {
    if (ConsoleDOM.clearBtn) {
      ConsoleDOM.clearBtn.addEventListener('click', async () => {
        if (this.apiService) {
          await this.apiService.clearConsoleLogs();
          ConsoleRenderer.clear();
        }
      });
    }
  },

  attachScrollButton() {
    if (ConsoleDOM.scrollBtn) {
      ConsoleDOM.scrollBtn.addEventListener('click', () => {
        ConsoleRenderer.scrollToBottom();
      });
    }
  },

  attachScrollListener() {
    if (ConsoleDOM.output) {
      ConsoleDOM.output.addEventListener('scroll', () => {
        ConsoleRenderer.updateScrollButton();
      });
    }
  }
};

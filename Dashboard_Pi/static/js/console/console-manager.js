// Manages the console log viewer that shows Flask server output
class ConsoleManager {
  constructor(settingsManager) {
    this.settings = settingsManager;
    this.isActive = false;
    this.pollingService = null;
    this.apiService = null;
  }

  // Set up console on page load
  init() {
    ConsoleDOM.init();
    ConsoleRenderer._loadState();
    ConsoleRenderer.init(this.settings);
    
    this.apiService = new APIService();
    
    ConsoleEventHandler.init(this.apiService);
    
    this.pollingService = new ConsolePollingService(
      this.apiService,
      ConsoleRenderer,
      this.settings.get('consolePoll')
    );
    
    // Update polling interval and max lines when settings change
    if (this.settings) {
      this.settings.onUpdate((newSettings) => {
        if (newSettings.consolePoll) {
          this.pollingService.setInterval(newSettings.consolePoll);
        }
        ConsoleRenderer.updateSettings(newSettings);
      });
    }
    
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }

  // Called when user navigates to console page
  activate() {
    if (this.isActive) return;
    this.isActive = true;
    this.pollingService.start();  // Start fetching logs
  }

  // Called when user navigates away
  deactivate() {
    if (!this.isActive) return;
    this.isActive = false;
    this.pollingService.stop();  // Stop fetching logs
  }
}


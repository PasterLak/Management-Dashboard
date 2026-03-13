// Main orchestrator for the device table feature
// Creates and wires together all device-related modules (rendering, polling, actions, etc.)
class DeviceManager {
  constructor(settingsManager) {
    this.settings = settingsManager;
    
    // Core services
    this.dom = new DeviceDOM();
    this.dataService = new DeviceDataService();
    DeviceDataService.DEFAULT_OFFLINE_THRESHOLD = this.settings.get('offlineThreshold') || DeviceDataService.DEFAULT_OFFLINE_THRESHOLD;
    this.apiService = new APIService();
    
    // Stats counter
    this.statsCounter = new StatsCounter('statsCounter', this.dataService);
    
    // Rendering
    this.rowRenderer = new DeviceRowRenderer(this.dataService);
    
    // Feature managers
    this.editHandler = new DeviceEditHandler(this.dom);
    this.pinManager = new DevicePinManager(this.dom, this.settings, this.dataService);
    this.renderer = new DeviceRenderer(
      this.dom,
      this.dataService,
      this.rowRenderer,
      this.pinManager,
      this.settings,
      this.statsCounter
    );
    
    // User actions (delete, blink, etc.)
    this.actions = new DeviceActions(
      this.dataService,
      this.apiService,
      this.rowRenderer,
      this.editHandler
    );
    
    // Periodic updates
    this.pollingService = new DevicePollingService(
      this.apiService,
      this.dataService,
      this.renderer,
      this.actions,
      this.settings
    );
    
    // Event handling
    this.eventHandler = new DeviceEventHandler(
      this.actions,
      this.pinManager,
      this.renderer
    );
  }

  // Set up the device table on page load
  init() {
    if (!this.dom.isAvailable()) {
      console.warn('Device table not found in DOM');
      return;
    }

    // Initial render
    this.renderer.render(this.dataService.getAll());
    
    // Initial stats update
    this.statsCounter.updateImmediate();

    // Setup events
    this.eventHandler.setup();

    // Start polling
    this.pollingService.start();

    // Listen for settings changes
    this._setupSettingsListener();
  }

  _setupSettingsListener() {
    this.settings.onUpdate((changes) => {
      if (changes.pollInterval) {
        this.pollingService.setInterval(changes.pollInterval);
      }
      
      if (changes.tickOffline) {
        this.pollingService.restart();
      }

      if (typeof changes.offlineThreshold === 'number') {
        DeviceDataService.DEFAULT_OFFLINE_THRESHOLD = changes.offlineThreshold;
        this.renderer.updateOfflineStatus();
      }
    });
  }
}

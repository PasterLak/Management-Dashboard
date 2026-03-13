// Main orchestrator for the simulator feature
// Simulators are virtual BL602 devices that POST to /api/data for testing
class SimulatorManager {
  constructor(settingsManager) {
    this.settings = settingsManager;
    
    // Core services
    this.dom = new SimulatorDOM();
    this.dataService = new SimulatorDataService();
    this.apiService = new APIService();
    
    // Rendering
    this.cardRenderer = new SimulatorCardRenderer();
    this.consoleManager = new SimulatorConsoleManager(this.dom);
    this.renderer = new SimulatorRenderer(this.dom, this.dataService, this.cardRenderer);
    
    // Periodic updates for running simulators
    this.pollingService = new SimulatorPollingService(
      this.dataService,
      this.apiService,
      this.consoleManager,
      this.settings
    );
    
    // User actions (start, stop, send, remove)
    this.actions = new SimulatorActions(
      this.dataService,
      this.apiService,
      this.consoleManager,
      this.pollingService,
      this.renderer,
      this.settings
    );
    
    // Event handling
    this.eventHandler = new SimulatorEventHandler(
      this.dom,
      this.actions,
      this.consoleManager,
      this.renderer
    );
  }

  // Set up simulators on page load
  async init() {
    if (!this.dom.isAvailable()) {
      console.warn('Simulator UI not found in DOM');
      return;
    }

    // Load polling interval from settings
    const pollInterval = this.settings.get('simulatorPoll');
    this.pollingService.setInterval(pollInterval);

    // Setup numeric validation for interval fields
    if (typeof setupNumericInputValidationByField === 'function') {
      setupNumericInputValidationByField(SimulatorConfig.FIELDS.INTERVAL);
    }

    // Load simulators from localStorage
    this.dataService.load();
    
    // Sync running state from server
    await this.pollingService.syncRunningState();
    
    // Initial render
    this.renderer.render();
    
    // Scroll all consoles to bottom after initial render
    this._scrollAllConsolesToBottom();
    
    // Setup event handlers
    this.eventHandler.setup();
    
    // Listen for settings changes
    this._setupSettingsListener();
  }

  // Scroll all consoles to bottom
  _scrollAllConsolesToBottom() {
    const simulators = this.dataService.getAll();
    simulators.forEach(sim => {
      const consoleEl = this.dom.findConsoleOutput(sim.id);
      if (consoleEl) {
        consoleEl.scrollTop = consoleEl.scrollHeight;
      }
    });
  }

  _setupSettingsListener() {
    this.settings.onUpdate((changes) => {
      if (changes.simulatorPoll) {
        this.pollingService.setInterval(changes.simulatorPoll);
      }
    });
  }
}

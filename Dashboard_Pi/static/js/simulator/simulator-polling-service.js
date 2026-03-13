// Periodically fetches status for all running simulators
// Polls /api/simulator/{id} every 500ms (default, configurable) and updates console output
class SimulatorPollingService extends PollingService {
  constructor(dataService, apiService, consoleManager, settingsManager) {
    super(SimulatorConfig.DEFAULTS.POLL_INTERVAL);
    this.dataService = dataService;
    this.api = apiService;
    this.consoleManager = consoleManager;
    this.settings = settingsManager;
  }

  async _pollOnce() {
    const runningSimulators = this.dataService.getRunning();
    
    if (runningSimulators.length === 0) {
      this.stop();
      return;
    }

    for (const sim of runningSimulators) {
      await this._pollSimulator(sim);
    }
  }

  async _pollSimulator(sim) {
    try {
      const data = await this.api.getSimulatorStatus(sim.id);

      if (data.responses && data.responses.length > 0) {
        const newConsole = data.responses.join('\n');
        if (newConsole !== sim.console) {
          sim.console = newConsole;
          this.consoleManager.updateConsole(sim.id, newConsole);
          this.dataService.save();
        }
      }

      if (sim.autoUpdate && data.currentPayload) {
        const newJson = JSON.stringify(data.currentPayload, null, 2);
        if (newJson !== sim.json) {
          sim.json = newJson;
          this.consoleManager.updatePayload(sim.id, newJson);
          this.dataService.save();
        }
      }
    } catch (err) {
      console.error(`Simulator ${sim.id} polling failed:`, err);
    }
  }

  async syncRunningState() {
    const simulators = this.dataService.getAll();
    
    for (const sim of simulators) {
      try {
        const data = await this.api.getSimulatorStatus(sim.id);
        sim.running = data.running || false;
        
        if (data.responses && data.responses.length > 0) {
          sim.console = data.responses.join('\n');
        }
        
        if (sim.autoUpdate && data.currentPayload) {
          sim.json = JSON.stringify(data.currentPayload, null, 2);
        }
      } catch (err) {
        sim.running = false;
        if (err.status !== 404) {
          console.error(`Failed to sync simulator ${sim.id}:`, err);
        }
      }
    }

    if (this.dataService.hasRunningSimulators()) {
      this.start();
    }
  }
}

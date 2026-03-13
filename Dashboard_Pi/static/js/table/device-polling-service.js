// Periodically fetches device list from the server
// Polls /api/devices and updates offline status indicators
class DevicePollingService extends PollingService {
  constructor(apiService, dataService, renderer, actions, settingsManager) {
    super(settingsManager.get('pollInterval'));
    this.api = apiService;
    this.dataService = dataService;
    this.renderer = renderer;
    this.actions = actions;
    this.settings = settingsManager;
    this.offlineIntervalId = null;
  }

  start() {
    super.start();
    this.renderer.updateOfflineStatus();
    this.offlineIntervalId = setInterval(
      () => this.renderer.updateOfflineStatus(),
      this.settings.get('tickOffline')
    );
  }

  stop() {
    super.stop();
    if (this.offlineIntervalId) {
      clearInterval(this.offlineIntervalId);
      this.offlineIntervalId = null;
    }
  }

  restart() {
    this.stop();
    this.start();
  }

  async _pollOnce() {
    try {
      const result = await this.api.fetchDevices();
      const newDevices = result.devices || {};
      const serverNowMs = result.serverNowMs;
      if (typeof serverNowMs === 'number' && !Number.isNaN(serverNowMs)) {
        this.dataService.setServerNow(serverNowMs);
      }

      if (this.actions.isEditing()) {
        this.dataService.setAll(newDevices);
        return;
      }

      const changes = this.dataService.detectChanges(newDevices);
      
      if (changes.structureChanged) {
        this.renderer.render(newDevices);
      } else if (changes.dataChanged) {
        const needsResort = this.checkIfResortNeeded(newDevices);
        if (needsResort) {
          this.renderer.render(newDevices);
        } else {
          this.renderer.updateInPlace(newDevices, changes.changedIds);
        }
      } else {
        this.dataService.setAll(newDevices);
      }
    } catch (err) {
      console.error('Device polling failed:', err);
    }
  }

  // Check if the sort order would change based on new timestamps (beyond polling threshold - othwerwise the order of online devices would change continuously)
  checkIfResortNeeded(newDevices) {
    const currentDomOrder = Array.from(this.renderer.dom.getAllRows()).map(row => row.dataset.id);
    
    const newSortedRows = this.dataService.toSortedRows(newDevices, currentDomOrder);
    const newOrder = newSortedRows.map(r => r.id);
    
    if (currentDomOrder.length !== newOrder.length) return true;

    for (let i = 0; i < newOrder.length; i++) {
      if (currentDomOrder[i] !== newOrder[i]) {
        return true;
      }
    }
    
    return false;
  }
}

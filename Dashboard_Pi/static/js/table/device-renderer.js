// Renders the device table with current device data
// Updates rows, offline status, and preserves expanded pin details
class DeviceRenderer {
  constructor(dom, dataService, rowRenderer, pinManager, settingsManager, statsCounter) {
    this.dom = dom;
    this.dataService = dataService;
    this.rowRenderer = rowRenderer;
    this.pinManager = pinManager;
    this.settings = settingsManager;
    this.statsCounter = statsCounter;
  }

  // Full re-render
  render(devices) {
    if (!this.dom.isAvailable()) return;
    
    const currentDomOrder = Array.from(this.dom.getAllRows()).map(row => row.dataset.id);
    const rows = this.dataService.toSortedRows(devices, currentDomOrder);

    // No devices available
    if (rows.length === 0) {
      this.dom.replaceContent(this.rowRenderer.createEmptyRow());
      this.dataService.setAll(devices);
      return;
    }

    // Create rows
    const fragment = document.createDocumentFragment();
    const offlineThreshold = DeviceDataService.DEFAULT_OFFLINE_THRESHOLD;

    rows.forEach(row => {
      fragment.appendChild(this.rowRenderer.createRow(row, offlineThreshold));
    });

    this.dom.replaceContent(fragment);
    this.dataService.setAll(devices);

    if (window.feather) feather.replace();
    
    // Update stats counter
    if (this.statsCounter) {
      this.statsCounter.update();
    }
  }

  // In-Place Update (without full re-render)
  updateInPlace(newDevices, changedIds) {
    const offlineThreshold = DeviceDataService.DEFAULT_OFFLINE_THRESHOLD;
    
    changedIds.forEach(deviceId => {
      const row = this.dom.getRow(deviceId);
      if (!row) return;

      const deviceData = newDevices[deviceId];
      
      // Update row data
      this.rowRenderer.updateRowInPlace(row, deviceData, offlineThreshold);
    });

    this.dataService.setAll(newDevices);
    
    // Update stats counter
    if (this.statsCounter) {
      this.statsCounter.update();
    }
  }

  // Updates offline status of all rows
  updateOfflineStatus() {
    if (!this.dom.isAvailable()) return;
    
    const threshold = DeviceDataService.DEFAULT_OFFLINE_THRESHOLD;
    const rows = this.dom.getAllRows();

    this.dataService.syncLiveOfflineStates();

    rows.forEach(row => {
      const device = this.dataService.getDevice(row.dataset.id);
      if (!device) return;

      // Update relative "last seen" string so it keeps advancing even without data changes
      const cells = row.querySelectorAll('td');
      const lastSeenCell = cells[DeviceConfig.COLUMNS.LAST_SEEN];
      if (lastSeenCell && window.TimeUtils && typeof window.TimeUtils.formatRelativeTime === 'function') {
        const ts = typeof device.last_seen === 'number'
          ? device.last_seen
          : new Date(device.last_seen).getTime();
        const nowMs = this.dataService.getServerNow();
        const isOffline = this.dataService.isOffline(device, threshold);
        const display = Number.isNaN(ts)
          ? 'unknown'
          : this.rowRenderer.formatLastSeenWithRate(
              ts,
              nowMs,
              Number(device.request_rate_hz || 0),
              isOffline,
            );
        if (lastSeenCell.textContent !== display) {
          lastSeenCell.textContent = display;
        }
      }

      const isOffline = this.dataService.isOffline(device, threshold);
      
      // Update status badge
      const statusCell = row.querySelector('.status-cell');
      if (statusCell) {
        this.rowRenderer.updateStatusBadge(statusCell, isOffline);
      }
    });
    
    // Update stats counter
    if (this.statsCounter) {
      this.statsCounter.update();
    }
  }
}

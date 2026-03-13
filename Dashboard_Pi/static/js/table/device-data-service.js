// Manages device data in memory
// Handles sorting, offline detection, and last-seen timestamps
class DeviceDataService {
  static DEFAULT_OFFLINE_THRESHOLD = 5000;

  constructor() {
    this.devices = window.initialDevices || {};
    const initialServerNow = (typeof window !== 'undefined' && typeof window.serverNowMs === 'number') ? window.serverNowMs : Date.now();
    this.serverOffsetMs = initialServerNow - Date.now();
    this.onlineOrder = new Map();
    this.onlineOrderSequence = 0;
    this.lastKnownOfflineById = new Map();

    const initialOfflineStates = this.createOfflineStateSnapshot(this.devices);
    this.lastKnownOfflineById = initialOfflineStates;
    this.onlineOrder = this.buildInitialOnlineOrder(this.devices, initialOfflineStates);
    this.onlineOrderSequence = this.onlineOrder.size;
  }

  // Returns all devices
  getAll() {
    return this.devices;
  }

  // Returns a device
  getDevice(deviceId) {
    return this.devices[deviceId];
  }

  // Sets all devices
  setAll(devices) {
    const nextOnlineOrderState = this.buildNextOnlineOrder(devices);
    this.onlineOrder = nextOnlineOrderState.order;
    this.onlineOrderSequence = nextOnlineOrderState.sequence;
    this.devices = devices;
    this.lastKnownOfflineById = this.createOfflineStateSnapshot(devices);
  }

  setServerNow(ms) {
    if (typeof ms === 'number' && !Number.isNaN(ms)) {
      this.serverOffsetMs = ms - Date.now();
    }
  }

  getServerNow() {
    return Date.now() + (this.serverOffsetMs || 0);
  }

  // Updates a device
  updateDevice(deviceId, updates) {
    if (this.devices[deviceId]) {
      this.devices[deviceId] = { ...this.devices[deviceId], ...updates };
    }
  }

  // Deletes a device
  deleteDevice(deviceId) {
    delete this.devices[deviceId];
    this.onlineOrder.delete(deviceId);
    this.lastKnownOfflineById.delete(deviceId);
  }

  getDeviceTimestamp(device) {
    return new Date(device?.last_seen).getTime();
  }

  createOfflineStateSnapshot(devices = this.devices) {
    return new Map(
      Object.entries(devices).map(([id, device]) => [id, this.isOffline(device)])
    );
  }

  buildInitialOnlineOrder(devices, offlineStates = this.createOfflineStateSnapshot(devices)) {
    const order = new Map();
    const onlineEntries = Object.entries(devices)
      .filter(([id]) => offlineStates.get(id) !== true)
      .map(([id, device]) => ({
        id,
        timestamp: this.getDeviceTimestamp(device),
      }))
      .sort((a, b) => {
        if (a.timestamp !== b.timestamp) {
          return a.timestamp - b.timestamp;
        }

        return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      });

    onlineEntries.forEach(({ id }, index) => {
      order.set(id, index + 1);
    });

    return order;
  }

  buildNextOnlineOrder(devices) {
    const nextOrder = new Map(this.onlineOrder);
    let nextSequence = this.onlineOrderSequence;
    const newlyOnline = [];

    Array.from(nextOrder.keys()).forEach(id => {
      if (!devices[id] || this.isOffline(devices[id])) {
        nextOrder.delete(id);
      }
    });

    Object.entries(devices).forEach(([id, device]) => {
      const isCurrentlyOffline = this.isOffline(device);
      if (isCurrentlyOffline) {
        nextOrder.delete(id);
        return;
      }

      const wasOffline = this.lastKnownOfflineById.has(id)
        ? this.lastKnownOfflineById.get(id)
        : true;

      if (wasOffline || !nextOrder.has(id)) {
        nextOrder.delete(id);
        newlyOnline.push({
          id,
          timestamp: this.getDeviceTimestamp(device),
        });
      }
    });

    newlyOnline
      .sort((a, b) => {
        if (a.timestamp !== b.timestamp) {
          return a.timestamp - b.timestamp;
        }

        return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      })
      .forEach(({ id }) => {
        nextSequence += 1;
        nextOrder.set(id, nextSequence);
      });

    return {
      order: nextOrder,
      sequence: nextSequence,
    };
  }

  syncLiveOfflineStates(devices = this.devices) {
    this.lastKnownOfflineById = this.createOfflineStateSnapshot(devices);
  }

  // Converts devices to sorted rows
  toSortedRows(devices = this.devices, preferredOrder = []) {
    const preferredOrderIndex = new Map(preferredOrder.map((id, index) => [id, index]));
    const nextOnlineOrderState = this.buildNextOnlineOrder(devices);
    const nextOnlineOrder = nextOnlineOrderState.order;

    return Object.entries(devices).map(([id, d]) => {
      const timestamp = this.getDeviceTimestamp(d);
      const offline = this.isOffline(d);
      const nowMs = this.getServerNow();

      return {
        id,
        ip: d.ip,
        description: d.description || '',
        request_rate_hz: Number(d.request_rate_hz || 0),
          last_seen: (window.TimeUtils && typeof window.TimeUtils.formatRelativeTime === 'function')
            ? window.TimeUtils.formatRelativeTime(timestamp, nowMs)
            : new Date(timestamp).toISOString(),
        timestamp,
        onlineOrder: nextOnlineOrder.has(id) ? nextOnlineOrder.get(id) : Number.NEGATIVE_INFINITY,
        blink: d.blink || false,
        pins: d.pins || {},
        offline
      };
    }).sort((a, b) => {
      if (a.offline !== b.offline) {
        return a.offline ? 1 : -1;
      }

      if (a.offline && b.offline) {
        if (a.timestamp !== b.timestamp) {
          return b.timestamp - a.timestamp;
        }

        return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      }

      if (a.onlineOrder !== b.onlineOrder) {
        return b.onlineOrder - a.onlineOrder;
      }

      const preferredA = preferredOrderIndex.has(a.id) ? preferredOrderIndex.get(a.id) : Number.POSITIVE_INFINITY;
      const preferredB = preferredOrderIndex.has(b.id) ? preferredOrderIndex.get(b.id) : Number.POSITIVE_INFINITY;

      if (preferredA !== preferredB) {
        return preferredA - preferredB;
      }

      return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  // Checks if device is offline
  isOffline(device, offlineThreshold = DeviceDataService.DEFAULT_OFFLINE_THRESHOLD) {
    const now = this.getServerNow();
    const ts = new Date(device.last_seen).getTime();
    if (Number.isNaN(ts)) return true;
    return (now - ts) > offlineThreshold;
  }

  // Detects changes between old and new devices
  detectChanges(newDevices) {
    const prevIds = new Set(Object.keys(this.devices));
    const newIds = Object.keys(newDevices);

    // Structure changes (devices added/removed)
    const structureChanged = newIds.length !== prevIds.size || 
                            newIds.some(id => !prevIds.has(id));

    if (structureChanged) {
      return { structureChanged: true, dataChanged: false, changedIds: [] };
    }

    // Data changes
    const changedIds = newIds.filter(id => {
      const prev = this.devices[id];
      const curr = newDevices[id];
      if (!prev) return true;
      
      return prev.last_seen !== curr.last_seen || 
              Number(prev.request_rate_hz || 0) !== Number(curr.request_rate_hz || 0) ||
             prev.description !== curr.description ||
             prev.blink !== curr.blink ||
             JSON.stringify(prev.pins || {}) !== JSON.stringify(curr.pins || {});
    });

    return {
      structureChanged: false,
      dataChanged: changedIds.length > 0,
      changedIds: changedIds
    };
  }
}

// Executes device operations (delete, blink, edit description)
// Communicates with backend API and updates device state
class DeviceActions {
  constructor(dataService, apiService, rowRenderer, editHandler) {
    this.dataService = dataService;
    this.api = apiService;
    this.rowRenderer = rowRenderer;
    this.editHandler = editHandler;
  }

  // Deletes a device
  async deleteDevice(deviceId, onSuccess) {
    try {
      await this.api.deleteDevice(deviceId);
      this.dataService.deleteDevice(deviceId);
      
      if (onSuccess) onSuccess();
    } catch (err) {
      alert('Deleting failed.');
    }
  }

  // Toggles Blink
  async toggleBlink(deviceId, onSuccess) {
    try {
      const newBlinkState = await this.api.toggleBlink(deviceId);
      this.dataService.updateDevice(deviceId, { blink: newBlinkState });
      
      if (onSuccess) onSuccess(newBlinkState);
    } catch (err) {
      alert('Toggle blink failed.');
    }
  }

  // Starts Edit
  startEdit(deviceId) {
    this.editHandler.startEdit(deviceId);
  }

  // Finishes Edit
  async finishEdit(deviceId, cancel) {
    return await this.editHandler.finishEdit(deviceId, cancel);
  }

  // Checks if currently editing
  isEditing() {
    return this.editHandler.isCurrentlyEditing();
  }

  // Clear all devices from table
  async clearTable(onSuccess) {
    const devices = this.dataService.getAll();
    const deviceIds = Object.keys(devices);
    
    // Check if there are any devices
    if (deviceIds.length === 0) {
      await ConfirmDialog.show({
        title: 'No Devices',
        message: 'There are no devices to clear.',
        type: 'info',
        infoOnly: true
      });
      return;
    }
    
    const confirmed = await ConfirmDialog.show({
      title: 'Clear All Devices?',
      message: 'This will remove all devices from the table. This action cannot be undone.',
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      type: 'danger'
    });
    
    if (!confirmed) return;

    try {
      // Delete all devices
      const deletePromises = deviceIds.map(id => this.api.deleteDevice(id));
      await Promise.all(deletePromises);
      
      // Clear local data
      deviceIds.forEach(id => this.dataService.deleteDevice(id));
      
      if (onSuccess) onSuccess();
    } catch (err) {
      alert('Clearing table failed.');
    }
  }
}

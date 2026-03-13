// Configuration constants for the device table
// Contains column indices, CSS classes, button selectors, and API endpoints
class DeviceConfig {
  // Column Definitions
  static COLUMNS = {
    STATUS: 0,
    ID: 1,
    IP: 2,
    DESCRIPTION: 3,
    LAST_SEEN: 4,
    ACTIONS: 5
  };

  // CSS Classes
  static CSS_CLASSES = {
    BLINK_ACTIVE: 'blink-active',
    ACTIVE: 'active',
    STATUS_ONLINE: 'device-status--online',
    STATUS_OFFLINE: 'device-status--offline'
  };

  // Button Selectors
  static BUTTONS = {
    EDIT: '.edit-btn',
    DELETE: '.delete-btn',
    COPY: '.copy-btn',
    BLINK: '.blink-btn',
    OK: '.ok-btn',
    CANCEL: '.cancel-btn'
  };

  // API Endpoints
  static API = {
    DEVICES: '/api/devices',
    UPDATE_DESC: '/api/update_description',
    DELETE: '/api/delete_device',
    TOGGLE_BLINK: '/api/toggle_blink'
  };
}

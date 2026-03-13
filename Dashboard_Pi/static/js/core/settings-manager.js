// Central settings manager that stores user preferences in localStorage
// Controls polling intervals, offline thresholds, and display limits
class SettingsManager {
  constructor() {
    // Load defaults from SettingsConfig to ensure consistency
    this.defaults = SettingsConfig.getDefaults();
    this.settings = this.load();
    this.updateCallbacks = [];
  }

  // Load settings from browser's localStorage
  load() {
    try {
      const saved = localStorage.getItem("dashboard_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.defaults, ...parsed };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    return { ...this.defaults };
  }

  // Get a specific setting value
  get(key) {
    return this.settings[key];
  }

  // Save new settings to localStorage
  update(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem("dashboard_settings", JSON.stringify(this.settings));
      // Notify all registered callbacks
      this.updateCallbacks.forEach(callback => callback(this.settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  // Register callback to be notified when settings change
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }
}

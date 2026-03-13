// Base class for periodic data fetching (used by devices, simulators, and console)
// Subclasses just need to implement _pollOnce() to define what data to fetch
class PollingService {
  constructor(interval) {
    this.intervalId = null;
    this.interval = interval;
  }

  // Start polling at the configured interval
  start() {
    if (this.intervalId) return;
    this._pollOnce();
    this.intervalId = setInterval(() => this._pollOnce(), this.interval);
  }

  // Stop polling
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Restart with current interval
  restart() {
    this.stop();
    this.start();
  }

  // Change polling interval and restart if already running
  setInterval(newInterval) {
    this.interval = newInterval;
    if (this.intervalId) this.restart();
  }

  // Override this in subclasses to define what to fetch
  async _pollOnce() {
    throw new Error('_pollOnce must be implemented by subclass');
  }
}


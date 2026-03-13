// Periodically fetches console logs from the server
// Polls /api/console/logs every 500ms (default, configurable) and passes them to the renderer
class ConsolePollingService extends PollingService {
  constructor(apiService, renderer, interval) {
    super(interval);
    this.api = apiService;
    this.renderer = renderer;
  }

  async _pollOnce() {
    try {
      const data = await this.api.fetchConsoleLogs();
      if (data && data.logs) {
        this.renderer.renderLogs(data.logs);
      }
    } catch (error) {
      console.error('Console polling error:', error);
    }
  }
}

// Unified API service that talks to the Flask backend
// Handles all HTTP requests (GET/POST) for devices, simulators, and console logs
class APIService {
  // Basic HTTP GET wrapper
  async get(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GET ${url} failed`);
    return await response.json();
  }

  // Basic HTTP POST wrapper
  async post(url, data) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`POST ${url} failed`);
    return await response.json();
  }

  // Device-related API calls
  async fetchDevices() {
    const data = await this.get('/api/devices');
    return {
      devices: data.devices || {},
      serverNowMs: data.server_now_ms
    };
  }

  async deleteDevice(deviceId) {
    await this.post('/api/delete_device', { node_id: deviceId });
    return true;
  }

  async toggleBlink(deviceId) {
    const data = await this.post('/api/toggle_blink', { node_id: deviceId });
    return data.blink;
  }

  // Simulator-related API calls
  async startSimulator(id, interval, payload, autoUpdate, maxResponses = 100) {
    return await this.post('/api/simulator/start', { id, interval, payload, autoUpdate, maxResponses });
  }

  async stopSimulator(id) {
    return await this.post('/api/simulator/stop', { id });
  }

  async sendSimulatorOnce(id, payload) {
    return await this.post('/api/simulator/send', { id, payload });
  }

  async getSimulatorStatus(id) {
    return await this.get(`/api/simulator/status/${id}`);
  }

  async updateSimulatorConfig(id, autoUpdate) {
    return await this.post('/api/simulator/update', { id, autoUpdate });
  }

  async updateSimulatorPayload(id, payload) {
    return await this.post('/api/simulator/update_payload', { id, payload });
  }

  async clearSimulatorResponses(id) {
    return await this.post('/api/simulator/clear', { id });
  }

  async deleteSimulatorResponses(id) {
    return await this.post('/api/simulator/delete', { id });
  }

  // Console log API calls
  async fetchConsoleLogs() {
    try {
      const data = await this.get('/api/console/logs');
      return data;
    } catch (error) {
      return { logs: [] };
    }
  }

  async clearConsoleLogs() {
    try {
      return await this.post('/api/console/clear', {});
    } catch (error) {
      return { status: 'error' };
    }
  }
}

// Executes simulator operations (start, stop, send, delete)
// Communicates with the backend and updates simulator state
class SimulatorActions {
  constructor(dataService, apiService, consoleManager, pollingService = null, renderer = null, settingsManager = null) {
    this.dataService = dataService;
    this.api = apiService;
    this.consoleManager = consoleManager;
    this.pollingService = pollingService;
    this.renderer = renderer;
    this.settings = settingsManager;
  }

  // Start simulator
  async start(id, onSuccess) {
    const sim = this.dataService.getById(id);
    if (!sim || sim.running) return;

    const validation = this.dataService.validateJSON(sim.json);
    if (!validation.valid) {
      alert(`Invalid JSON in payload of simulator ${sim.name}!\n\nError: ${validation.error}`);
      return;
    }

    try {
      const maxResponses = this.settings ? this.settings.get('maxSimulatorResponses') : 100;
      
      const result = await this.api.startSimulator(id, sim.interval, sim.json, sim.autoUpdate, maxResponses);
      console.log('Simulator started:', result);
      
      const data = await this.api.getSimulatorStatus(id);
      if (data.responses && data.responses.length > 0) {
        const initialConsole = data.responses.join('\n');
        sim.console = initialConsole;
      }
      
      this.dataService.update(id, { running: true });

      if (!sim.autoUpdate && sim.originalJson === null) {
        sim.originalJson = sim.json;
        sim.hasUnsavedChanges = false;
      }

      this.dataService.save();
      
      if (this.renderer) {
        this.renderer.scheduleScroll(id);
      }
      
      if (onSuccess) onSuccess();  
      
      if (this.pollingService) {
        this.pollingService.start();
      }
      
      return true;
    } catch (err) {
      this.dataService.update(id, { running: false });
      if (onSuccess) onSuccess();
      return false;
    }
  }

  // Stop simulator
  async stop(id, onSuccess) {
    const sim = this.dataService.getById(id);
    if (!sim || !sim.running) return;

    try {
      const result = await this.api.stopSimulator(id);
      console.log('Simulator stopped:', result);
      
      const data = await this.api.getSimulatorStatus(id);
      if (data.responses && data.responses.length > 0) {
        const finalConsole = data.responses.join('\n');
        sim.console = finalConsole;
        this.dataService.save();
      }
      
      this.dataService.update(id, { running: false });
      
      if (this.renderer) {
        this.renderer.scheduleScroll(id);
      }
      
      if (onSuccess) onSuccess();  
      
      return true;
    } catch (err) {
      return false;
    }
  }

  // Send once
  async sendOnce(id) {
    const sim = this.dataService.getById(id);
    if (!sim) return;

    try {
      const result = await this.api.sendSimulatorOnce(id, sim.json);
      console.log('Sent once:', result);
      
      const data = await this.api.getSimulatorStatus(id);
      if (data.responses && data.responses.length > 0) {
        const newConsole = data.responses.join('\n');
        sim.console = newConsole;
        this.consoleManager.updateConsole(id, newConsole);
      }
      
      return true;
    } catch (err) {
      alert('POST failed!');
      return false;
    }
  }

  // Clear server responses
  async clear(id, onSuccess) {
    const sim = this.dataService.getById(id);
    if (!sim) return;

    try {
      await this.api.clearSimulatorResponses(id);
      
      sim.console = '';
      
      this.consoleManager.clearCache(id);
      this.consoleManager.updateConsole(id, 'No responses...');
      
      this.dataService.save();
      
      return true;
    } catch (err) {
      alert('Failed to clear responses!');
      return false;
    }
  }

  // Remove simulator
  async remove(id, onSuccess) {
    const sim = this.dataService.getById(id);
    
    if (sim && sim.running) {
      await this.stop(id);
    }

    if (this.renderer) {
      await this.renderer.removeCardWithAnimation(id);
    }

    this.dataService.remove(id);
    this.dataService.save();

    try {
      await this.api.deleteSimulatorResponses(id);
    } catch (err) {
      console.error('Failed to delete simulator responses:', err);
    }
    
    return true;
  }

  // Update simulator field
  updateField(id, field, value) {
    const sim = this.dataService.getById(id);
    if (!sim) return;

    const updates = { [field]: value };
    
    if (field === SimulatorConfig.FIELDS.AUTO_UPDATE) {
      if (sim.running) {
        if (!value) {
          sim.originalJson = sim.json;
          sim.hasUnsavedChanges = false;
        } else {
          sim.originalJson = null;
          sim.hasUnsavedChanges = false;
        }
        
        this.api.updateSimulatorConfig(id, value).catch(err => {
          console.error('Failed to update autoUpdate:', err);
        });
      }
    }
    
    if (field === SimulatorConfig.FIELDS.JSON) {
      if (sim.running && !sim.autoUpdate) {
        if (sim.originalJson === null) {
          sim.originalJson = sim.json;
        }
        sim.hasUnsavedChanges = (value !== sim.originalJson);
      }
    }
    
    this.dataService.update(id, updates);
    this.dataService.save();
  }

  // Approve JSON changes (send new payload to server)
  async approveJsonChanges(id, onSuccess) {
    const sim = this.dataService.getById(id);
    if (!sim || !sim.running || sim.autoUpdate) return;

    const validation = this.dataService.validateJSON(sim.json);
    if (!validation.valid) {
      alert(`Invalid JSON!\n\nError: ${validation.error}`);
      return;
    }

    try {
      await this.api.updateSimulatorPayload(id, sim.json);
      
      sim.originalJson = sim.json;
      sim.hasUnsavedChanges = false;
      this.dataService.save();
      
      if (onSuccess) onSuccess();
      return true;
    } catch (err) {
      console.error('Failed to update payload:', err);
      alert('Failed to update payload on server!');
      return false;
    }
  }

  // Discard JSON changes (revert to original)
  discardJsonChanges(id, onSuccess) {
    const sim = this.dataService.getById(id);
    if (!sim || !sim.originalJson) return;

    sim.json = sim.originalJson;
    sim.hasUnsavedChanges = false;
    this.dataService.save();
    
    if (onSuccess) onSuccess();
    return true;
  }

  // Apply example to simulator
  applyExample(exampleType, targetSimId = null) {
    const example = SimulatorConfig.getExample(exampleType);
    if (!example) return null;

    const newId = this.dataService.getNextAvailableId();
    const examplePayload = this._buildExamplePayload(example, newId);
    const exampleSim = this.dataService.createSimulatorData(newId);
    exampleSim.name = `Example Simulator ${newId}`;
    exampleSim.json = JSON.stringify(examplePayload, null, 2);
    this.dataService.add(exampleSim);
    this.dataService.save();

    return { id: exampleSim.id, isNew: true };
  }

  _buildExamplePayload(example, newId) {
    const payload = JSON.parse(JSON.stringify(example));
    const padded = String(newId).padStart(3, '0');

    if (typeof payload.id === 'string' && payload.id.length > 0) {
      if (/_(\d+)$/.test(payload.id)) {
        payload.id = payload.id.replace(/_(\d+)$/, `_${padded}`);
      } else {
        payload.id = `${payload.id}_${padded}`;
      }
    } else {
      payload.id = `PineCone_${padded}`;
    }

    if (typeof payload.d === 'string' && payload.d.length > 0) {
      payload.d = `${payload.d} ${newId}`;
    }

    return payload;
  }

  // Bulk Actions
  
  // Start all simulators
  async startAll(onSuccess) {
    const simulators = this.dataService.getAll().filter(s => !s.running);
    
    if (simulators.length === 0) {
      await ConfirmDialog.show({
        title: 'No Simulators to Start',
        message: 'All simulators are already running or there are no simulators available.',
        type: 'info',
        infoOnly: true
      });
      return;
    }

    const confirmed = await ConfirmDialog.show({
      title: 'Start All Simulators?',
      message: `This will start ${simulators.length} simulator${simulators.length > 1 ? 's' : ''}.`,
      confirmText: 'Start All',
      cancelText: 'Cancel',
      type: 'success'
    });
    
    if (!confirmed) return;

    console.log(`Starting ${simulators.length} simulators...`);
    for (const sim of simulators) {
      await this.start(sim.id, null);
    }
    
    if (onSuccess) onSuccess();
  }

  // Stop all simulators
  async stopAll(onSuccess) {
    const simulators = this.dataService.getAll().filter(s => s.running);
    
    if (simulators.length === 0) {
      await ConfirmDialog.show({
        title: 'No Running Simulators',
        message: 'There are no running simulators to stop.',
        type: 'info',
        infoOnly: true
      });
      return;
    }

    const confirmed = await ConfirmDialog.show({
      title: 'Stop All Simulators?',
      message: `This will stop ${simulators.length} running simulator${simulators.length > 1 ? 's' : ''}.`,
      confirmText: 'Stop All',
      cancelText: 'Cancel',
      type: 'tertiary'
    });
    
    if (!confirmed) return;

    console.log(`Stopping ${simulators.length} simulators...`);
    for (const sim of simulators) {
      await this.stop(sim.id, null);
    }
    
    if (onSuccess) onSuccess();
  }

  // Send once for all simulators
  async sendOnceAll(onSuccess) {
    const simulators = this.dataService.getAll();
    
    if (simulators.length === 0) {
      await ConfirmDialog.show({
        title: 'No Simulators',
        message: 'There are no simulators available to send.',
        type: 'info',
        infoOnly: true
      });
      return;
    }

    const confirmed = await ConfirmDialog.show({
      title: 'Send Once for All?',
      message: `This will send the payload once for all ${simulators.length} simulator${simulators.length > 1 ? 's' : ''}.`,
      confirmText: 'Send All',
      cancelText: 'Cancel',
      type: 'secondary'
    });
    
    if (!confirmed) return;

    console.log(`Sending once for ${simulators.length} simulators...`);
    for (const sim of simulators) {
      await this.sendOnce(sim.id, null);
    }
    
    if (onSuccess) onSuccess();
  }

  // Clear all responses
  async clearAll(onSuccess) {
    const simulators = this.dataService.getAll();
    
    if (simulators.length === 0) {
      await ConfirmDialog.show({
        title: 'No Simulators',
        message: 'There are no simulators to clear.',
        type: 'info',
        infoOnly: true
      });
      return;
    }

    const confirmed = await ConfirmDialog.show({
      title: 'Clear All Responses?',
      message: `This will clear the server responses for all ${simulators.length} simulator${simulators.length > 1 ? 's' : ''}.`,
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      type: 'warning'
    });
    
    if (!confirmed) return;

    console.log(`Clearing responses for ${simulators.length} simulators...`);
    for (const sim of simulators) {
      await this.clear(sim.id, null);
    }
    
    if (onSuccess) onSuccess();
  }

  // Remove all simulators
  async removeAll(onSuccess) {
    const simulators = this.dataService.getAll();
    
    if (simulators.length === 0) {
      await ConfirmDialog.show({
        title: 'No Simulators',
        message: 'There are no simulators to remove.',
        type: 'info',
        infoOnly: true
      });
      return;
    }

    const confirmed = await ConfirmDialog.show({
      title: 'Remove All Simulators?',
      message: `This will permanently remove all ${simulators.length} simulator${simulators.length > 1 ? 's' : ''}. This action cannot be undone.`,
      confirmText: 'Remove All',
      cancelText: 'Cancel',
      type: 'danger'
    });
    
    if (!confirmed) return;

    console.log(`Removing ${simulators.length} simulators...`);
    // Create a copy of IDs to avoid mutation during iteration
    const simIds = simulators.map(s => s.id);
    for (const id of simIds) {
      await this.remove(id, null);
    }
    
    if (onSuccess) onSuccess();
  }
}

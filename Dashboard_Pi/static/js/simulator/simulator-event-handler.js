// Wires up all user interactions on simulator cards
// Handles button clicks, input changes, and scroll events
class SimulatorEventHandler {
  constructor(dom, actions, consoleManager, renderer) {
    this.dom = dom;
    this.actions = actions;
    this.consoleManager = consoleManager;
    this.renderer = renderer;
    this.buttonFeedback = new ButtonFeedback();
  }

  // Setup all event listeners
  setup() {
    this._setupInputHandlers();
    this._setupClickHandlers();
    this._setupScrollHandlers();
    this._setupAddButtonHandler();
    this._setupBulkActionHandlers();
  }

  // Setup input change handlers
  _setupInputHandlers() {
    document.addEventListener('input', (e) => {
      this._handleInput(e.target);
    });
  }

  // Setup click handlers
  _setupClickHandlers() {
    document.addEventListener('click', async (e) => {
      await this._handleClick(e);
    });
  }

  // Setup scroll handlers
  _setupScrollHandlers() {
    document.addEventListener('scroll', (e) => {
      this._handleScroll(e);
    }, true);
  }

  // Setup add simulator button
  _setupAddButtonHandler() {
    const addBtn = this.dom.getAddButton();
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._handleAddSimulator();
      });
    }
  }

  // Setup bulk action buttons
  _setupBulkActionHandlers() {
    const startAllBtn = this.dom.getStartAllButton();
    if (startAllBtn) {
      startAllBtn.addEventListener('click', async () => {
        await this.actions.startAll(() => {
          this.renderer.render();
        });
      });
    }

    const stopAllBtn = this.dom.getStopAllButton();
    if (stopAllBtn) {
      stopAllBtn.addEventListener('click', async () => {
        await this.actions.stopAll(() => {
          this.renderer.render();
        });
      });
    }

    const sendOnceAllBtn = this.dom.getSendOnceAllButton();
    if (sendOnceAllBtn) {
      sendOnceAllBtn.addEventListener('click', async () => {
        await this.actions.sendOnceAll(() => {
          this.renderer.render();
        });
      });
    }

    const clearAllBtn = this.dom.getClearAllButton();
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', async () => {
        await this.actions.clearAll(() => {
          this.renderer.render();
        });
      });
    }

    const removeAllBtn = this.dom.getRemoveAllButton();
    if (removeAllBtn) {
      removeAllBtn.addEventListener('click', async () => {
        await this.actions.removeAll(() => {
          this.renderer.render();
        });
      });
    }
  }

  // Handle input changes
  _handleInput(target) {
    if (!target.dataset.id || !target.dataset.field) return;

    const id = parseInt(target.dataset.id);
    const field = target.dataset.field;

    switch (field) {
      case SimulatorConfig.FIELDS.NAME:
        this.actions.updateField(id, field, target.value);
        break;
      case SimulatorConfig.FIELDS.INTERVAL:
        this.actions.updateField(id, field, parseInt(target.value) || SimulatorConfig.DEFAULTS.INTERVAL);
        break;
      case SimulatorConfig.FIELDS.JSON:
        this.actions.updateField(id, field, target.value);
        // Update button visibility without full re-render
        const sim = this.actions.dataService.getById(id);
        if (sim && sim.running && !sim.autoUpdate) {
          this._toggleJsonActionButtons(id, sim.hasUnsavedChanges);
        }
        break;
      case SimulatorConfig.FIELDS.AUTO_UPDATE:
        this.actions.updateField(id, field, target.checked);
        // Re-render to update textarea disabled state
        this.renderer.render();
        break;
    }
  }

  // Toggle JSON action buttons visibility without re-rendering
  _toggleJsonActionButtons(id, show) {
    const container = document.querySelector(`[data-json-actions-id="${id}"]`);
    if (container) {
      container.style.display = show ? 'flex' : 'none';
    }
  }

  // Handle click events
  async _handleClick(e) {
    // Pin info toggle
    if (this._handlePinInfoToggle(e)) return;
    
    // Example button
    if (this._handleExampleButton(e)) return;
    
    // Copy response button
    if (await this._handleCopyButton(e)) return;
    
    // Scroll button
    if (this._handleScrollButton(e)) return;
    
    // Action buttons
    this._handleActionButton(e);
  }

  // Handle pin info toggle
  _handlePinInfoToggle(e) {
    const pinInfoHeader = e.target.closest('#togglePinInfo');
    if (!pinInfoHeader) return false;

    const content = this.dom.findPinInfoContent();
    const toggle = this.dom.findPinInfoToggle();
    
    if (toggle) {
      toggle.classList.toggle(SimulatorConfig.CSS_CLASSES.ACTIVE);
    }
    if (content) {
      content.classList.toggle(SimulatorConfig.CSS_CLASSES.SHOW);
    }
    
    if (window.feather) feather.replace();
    return true;
  }

  // Handle example button
  _handleExampleButton(e) {
    const exampleBtn = e.target.closest('.sim-example-btn');
    if (!exampleBtn) return false;

    const exampleType = exampleBtn.dataset.example;
    const result = this.actions.applyExample(exampleType);
    
    if (result && result.id !== null && result.id !== undefined) {
      if (result.isNew) {
        this.renderer.addCard(result.id);
      } else {
        this.renderer.render();
      }
      this.renderer.scrollToSimulator(result.id);
    }
    
    return true;
  }

  // Handle copy button
  async _handleCopyButton(e) {
    const copyBtn = e.target.closest('.copy-response-btn');
    if (!copyBtn) return false;

    const simId = parseInt(copyBtn.dataset.id);
    const consoleEl = this.dom.findConsoleOutput(simId);
    
    if (!consoleEl) return true; // Found button but no console
    
    const text = consoleEl.textContent;
    const success = await ClipboardUtils.copy(text);
    
    if (success) {
      this.buttonFeedback.showSuccess(copyBtn);
    } else {
      this.buttonFeedback.showError(copyBtn);
    }
    
    return true;
  }

  // Handle scroll button
  _handleScrollButton(e) {
    const scrollBtn = e.target.closest('.scroll-to-bottom-btn');
    if (!scrollBtn) return false;

    const simId = parseInt(scrollBtn.dataset.id);
    this.consoleManager.handleScrollButtonClick(simId);
    return true;
  }

  // Handle action buttons
  _handleActionButton(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    e.preventDefault();

    if (btn.disabled) return;

    const id = parseInt(btn.dataset.id);
    const action = btn.dataset.action;

    switch (action) {
      case SimulatorConfig.ACTIONS.START:
        this.actions.start(id, () => this.renderer.render());
        break;
      case SimulatorConfig.ACTIONS.STOP:
        this.actions.stop(id, () => this.renderer.render());
        break;
      case SimulatorConfig.ACTIONS.SEND:
        this.actions.sendOnce(id);
        break;
      case SimulatorConfig.ACTIONS.CLEAR:
        this.actions.clear(id);
        break;
      case SimulatorConfig.ACTIONS.REMOVE:
        this.actions.remove(id); 
        break;
      case  SimulatorConfig.ACTIONS.APPROVE_JSON:
        this.actions.approveJsonChanges(id, () => this.renderer.render());
        break;
      case SimulatorConfig.ACTIONS.DISCARD_JSON:
        this.actions.discardJsonChanges(id, () => this.renderer.render());
        break;
    }
  }

  // Handle scroll events
  _handleScroll(e) {
    if (e.target?.classList?.contains('sim-console-output')) {
      this.consoleManager.updateScrollButton(e.target);
    }
  }

  // Handle add simulator
  _handleAddSimulator() {
    const id = this.actions.dataService.getNextAvailableId();
    const newSim = this.actions.dataService.createSimulatorData(id);
    this.actions.dataService.add(newSim);
    this.actions.dataService.save();
    this.renderer.addCard(id);
  }
}

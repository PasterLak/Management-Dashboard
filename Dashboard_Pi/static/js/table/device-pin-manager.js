// Controls the display of pin details in a dialog
class DevicePinManager {
  constructor(dom, settingsManager, dataService) {
    this.dom = dom;
    this.settings = settingsManager;
    this.dataService = dataService;
    this.currentDeviceId = null;
    this.pinContainer = null;
    this.updateInterval = null;
  }

  togglePinDetails(deviceId, deviceData) {
    if (!deviceData) return;
    this.showPinDialog(deviceId, deviceData);
  }

  async showPinDialog(deviceId, deviceData) {
    this._stopPinUpdates();
    
    this.currentDeviceId = deviceId;
    const pins = deviceData.pins || {};
    
    const pinContainer = this._createPinContainer(pins);
    this.pinContainer = pinContainer;
    
    if (window.ConfirmDialog) {
      const dialogPromise = ConfirmDialog.show({
        title: `Device ${deviceId}`,
        type: 'info',
        infoOnly: true,
        customContent: pinContainer
      });
      
      this._startPinUpdatesWhenReady(deviceId);
      
      await dialogPromise;
      
      this._stopPinUpdates();
      this.pinContainer = null;
      
      setTimeout(() => {
        if (window.feather) feather.replace();
      }, 100);
    } else {
      console.error('ConfirmDialog not available');
      alert(`Pin details for ${deviceId}:\n${JSON.stringify(pins, null, 2)}`);
    }
  }
  
  _startPinUpdatesWhenReady(deviceId) {
    if (document.body.contains(this.pinContainer)) {
      this._startPinUpdates(deviceId);
      return;
    }
    
    const observer = new MutationObserver(() => {
      if (this.pinContainer && document.body.contains(this.pinContainer)) {
        observer.disconnect();
        this._startPinUpdates(deviceId);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      if (this.pinContainer && document.body.contains(this.pinContainer)) {
        this._startPinUpdates(deviceId);
      }
    }, 2000);
  }

  _startPinUpdates(deviceId) {
    this._stopPinUpdates();
    
    const pollInterval = this.settings ? this.settings.get('pollInterval') : 1000;
    
    this.updateInterval = setInterval(() => {
      if (!this.pinContainer || !this.dataService) {
        this._stopPinUpdates();
        return;
      }
      
      const deviceData = this.dataService.getDevice(deviceId);
      if (!deviceData || !deviceData.pins) return;
      
      this._updatePinValues(deviceData.pins);
    }, pollInterval);
  }

  _stopPinUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.currentDeviceId = null;
  }

  _updatePinValues(pins) {
    if (!this.pinContainer) {
      this._stopPinUpdates();
      return;
    }

    const pinCards = this.pinContainer.querySelectorAll('.pin-card');
    
    pinCards.forEach(card => {
      const gpioElement = card.querySelector('.pin-gpio');
      if (!gpioElement) return;
      
      const gpio = gpioElement.textContent.trim();
      const pinData = pins[gpio];
      
      if (!pinData) return;

      const pinValue = pinData.v ?? pinData.value;
      const pinMode = pinData.m ?? pinData.mode;
      const pinName = pinData.n ?? pinData.name;

      const valueElement = card.querySelector('.pin-value');
      if (valueElement && pinValue !== undefined) {
        const currentValue = valueElement.textContent.trim();
        const newValue = String(pinValue);
        
        if (currentValue !== newValue) {
          valueElement.textContent = newValue;
        }
      }

      const modeElement = card.querySelector('.pin-mode');
      if (modeElement && pinMode) {
        const currentMode = modeElement.textContent.trim();
        const newMode = pinMode;
        
        if (currentMode !== newMode) {
          modeElement.className = `pin-mode pin-mode--${newMode}`;
          modeElement.textContent = newMode;
        }
      }

      const nameElement = card.querySelector('.pin-name');
      if (nameElement && pinName) {
        const currentName = nameElement.textContent.trim();
        const newName = pinName;
        
        if (currentName !== newName && newName !== '-') {
          nameElement.textContent = newName;
        }
      }
    });
  }

  _createPinContainer(pins) {
    const container = document.createElement('div');
    container.className = 'pin-details-container';

    const pinEntries = Object.entries(pins);

    const header = this._createHeader(pinEntries.length);
    container.appendChild(header);

    if (pinEntries.length === 0) {
      container.appendChild(this._createEmptyMessage());
    } else {
      container.appendChild(this._createPinsGrid(pinEntries));
    }

    return container;
  }

  _createHeader(pinCount) {
    const header = document.createElement('div');
    header.className = 'pin-details-header';
    
    const titleText = document.createElement('div');
    titleText.className = 'pin-title-text';
    titleText.innerHTML = `
      <i data-feather="cpu"></i>
      <span>Pin Configuration</span>
    `;
    
    const badge = document.createElement('span');
    badge.className = 'pin-count-badge';
    badge.textContent = pinCount;
    
    header.appendChild(titleText);
    header.appendChild(badge);
    return header;
  }

  _createEmptyMessage() {
    const noMsg = document.createElement('div');
    noMsg.className = 'no-pins-message';
    noMsg.innerHTML = '<div class="no-pins-content"><i data-feather="info"></i> No pins configured for this device</div>';
    return noMsg;
  }

  _createPinsGrid(pinEntries) {
    const grid = document.createElement('div');
    grid.className = 'pins-grid';

    pinEntries.forEach(([gpio, pin]) => {
      grid.appendChild(this._createPinCard(gpio, pin));
    });

    return grid;
  }

  _createPinCard(gpio, pin) {
    const pinMode = pin.m ?? pin.mode ?? 'input';
    const pinName = pin.n ?? pin.name ?? '-';
    const pinValue = pin.v ?? pin.value;

    const card = document.createElement('div');
    card.className = 'pin-card';
    card.innerHTML = `
      <div class="pin-card-header">
        <div class="pin-gpio">${gpio}</div>
        <span class="pin-mode pin-mode--${pinMode}">${pinMode}</span>
      </div>
      <div class="pin-card-body">
        <div class="pin-detail-row">
          <span class="pin-detail-label">Name:</span>
          <span class="pin-detail-value pin-name">${pinName}</span>
        </div>
        <div class="pin-detail-row">
          <span class="pin-detail-label">Value:</span>
          <span class="pin-value">${pinValue !== undefined ? pinValue : '-'}</span>
        </div>
      </div>
    `;
    return card;
  }
}


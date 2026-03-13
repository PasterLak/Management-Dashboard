// Stats Counter Component - Displays device  (table) statistics
// Shows total devices, online count, and offline count
// Allows clicking to copy device JSON to clipboard

class StatsCounter {
  constructor(containerId, dataService) {
    this.container = document.getElementById(containerId);
    this.dataService = dataService;
    this.currentCounts = { total: 0, online: 0, offline: 0 };
    this.animationDuration = 2000; // 2 seconds
    this.buttonFeedback = new ButtonFeedback();
    
    if (this.container) {
      this.render();
      this.attachEventListeners();
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="stats-counter-container">
        <div class="stats-card" data-card-type="total">
          <div class="stats-icon stats-icon--total">
            <i data-feather="hard-drive"></i>
          </div>
          <div class="stats-content">
            <div class="stats-label">Total Devices</div>
            <div class="stats-value" data-stat="total">0</div>
          </div>
        </div>
        
        <div class="stats-card" data-card-type="online">
          <div class="stats-icon stats-icon--online">
            <i data-feather="check-circle"></i>
          </div>
          <div class="stats-content">
            <div class="stats-label">Online</div>
            <div class="stats-value" data-stat="online">0</div>
          </div>
        </div>
        
        <div class="stats-card" data-card-type="offline">
          <div class="stats-icon stats-icon--offline">
            <i data-feather="x-circle"></i>
          </div>
          <div class="stats-content">
            <div class="stats-label">Offline</div>
            <div class="stats-value" data-stat="offline">0</div>
          </div>
        </div>
      </div>
    `;
    
    if (window.feather) {
      feather.replace();
    }
  }

  // Attach click event listeners to cards
  attachEventListeners() {
    const cards = this.container.querySelectorAll('.stats-card[data-card-type]');
    cards.forEach(card => {
      card.addEventListener('click', (e) => this.handleCardClick(e, card));
    });
  }

  // Handle card click to copy device JSON
  async handleCardClick(event, card) {
    const cardType = card.getAttribute('data-card-type');
    
    // Get filtered devices based on card type
    let devicesToCopy;
    const allDevices = this.dataService.getAll();
    
    switch (cardType) {
      case 'total':
        devicesToCopy = allDevices;
        break;
      case 'online':
        devicesToCopy = Object.fromEntries(
          Object.entries(allDevices).filter(([id, device]) => 
            !this.dataService.isOffline(device)
          )
        );
        break;
      case 'offline':
        devicesToCopy = Object.fromEntries(
          Object.entries(allDevices).filter(([id, device]) => 
            this.dataService.isOffline(device)
          )
        );
        break;
      default:
        return;
    }

    const success = await ClipboardUtils.copyJSON(
      ClipboardUtils.serializeDeviceMap(devicesToCopy)
    );
    this.showCopyFeedback(card, success, cardType);
  }

  showCopyFeedback(card, success, cardType) {
    let title, message, type;
    
    if (success) {
      title = 'Copied!';
      message = `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} devices JSON copied to clipboard.`;
      type = 'success';
    } else {
      title = 'Error!';
      message = 'Failed to copy to clipboard.';
      type = 'danger';
    }
    
    ConfirmDialog.show({
      title: title,
      message: message,
      type: type,
      infoOnly: true
    });
  }

  // Update stats with animation
  update() {
    const devices = this.dataService.getAll();
    const deviceList = Object.values(devices);
    
    const newCounts = {
      total: deviceList.length,
      online: deviceList.filter(d => !this.dataService.isOffline(d)).length,
      offline: deviceList.filter(d => this.dataService.isOffline(d)).length
    };
    
    Object.keys(newCounts).forEach(key => {
      if (this.currentCounts[key] !== newCounts[key]) {
        this.animateCounter(key, this.currentCounts[key], newCounts[key]);
      }
    });
    
    this.currentCounts = newCounts;
  }

  // Animate counter from old value to new value
  animateCounter(statKey, fromValue, toValue) {
    const element = this.container?.querySelector(`[data-stat="${statKey}"]`);
    if (!element) return;
    
    element.classList.add('stats-value--animating');
    
    const startTime = performance.now();
    const difference = toValue - fromValue;
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = Math.round(fromValue + (difference * easeOut));
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = toValue;
        element.classList.remove('stats-value--animating');
      }
    };
    
    requestAnimationFrame(animate);
  }

  // Force immediate update without animation
  updateImmediate() {
    const devices = this.dataService.getAll();
    const deviceList = Object.values(devices);
    
    this.currentCounts = {
      total: deviceList.length,
      online: deviceList.filter(d => !this.dataService.isOffline(d)).length,
      offline: deviceList.filter(d => this.dataService.isOffline(d)).length
    };
    
    Object.keys(this.currentCounts).forEach(key => {
      const element = this.container?.querySelector(`[data-stat="${key}"]`);
      if (element) {
        element.textContent = this.currentCounts[key];
      }
    });
  }
}

// Export for use in other scripts 
window.StatsCounter = StatsCounter;

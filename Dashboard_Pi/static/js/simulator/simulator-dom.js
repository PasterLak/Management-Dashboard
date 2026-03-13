// Finds and caches DOM elements for the simulator page
// Provides quick access to simulator list, buttons, and consoles
class SimulatorDOM {
  constructor() {
    this.simulatorList = document.getElementById('simulatorList');
    this.addSimulatorBtn = document.getElementById('addSimulator');
    this.startAllBtn = document.getElementById('startAll');
    this.stopAllBtn = document.getElementById('stopAll');
    this.sendOnceAllBtn = document.getElementById('sendOnceAll');
    this.clearAllBtn = document.getElementById('clearAll');
    this.removeAllBtn = document.getElementById('removeAll');
  }

  // Check if DOM elements are available
  isAvailable() {
    return this.simulatorList !== null;
  }

  // Get simulator list container
  getSimulatorList() {
    return this.simulatorList;
  }

  // Get add button
  getAddButton() {
    return this.addSimulatorBtn;
  }

  // Get bulk action buttons
  getStartAllButton() {
    return this.startAllBtn;
  }

  getStopAllButton() {
    return this.stopAllBtn;
  }

  getSendOnceAllButton() {
    return this.sendOnceAllBtn;
  }

  getClearAllButton() {
    return this.clearAllBtn;
  }

  getRemoveAllButton() {
    return this.removeAllBtn;
  }

  // Replace list content
  replaceListContent(content) {
    if (this.simulatorList) {
      if (typeof content === 'string') {
        this.simulatorList.innerHTML = content;
      } else {
        this.simulatorList.innerHTML = '';
        this.simulatorList.appendChild(content);
      }
    }
  }

  // Append card to list
  appendCard(card) {
    if (this.simulatorList && card) {
      this.simulatorList.appendChild(card);
    }
  }

  // Clear list
  clearList() {
    if (this.simulatorList) {
      this.simulatorList.innerHTML = '';
    }
  }

  // Find console output element
  findConsoleOutput(simId) {
    return document.querySelector(`.sim-console-output[data-id="${simId}"]`);
  }

  // Find payload textarea
  findPayloadTextarea(simId) {
    return document.querySelector(`textarea[data-id="${simId}"][data-field="json"]`);
  }

  // Find scroll button
  findScrollButton(consoleEl) {
    return consoleEl?.parentElement?.querySelector('.scroll-to-bottom-btn');
  }

  // Find pin info content
  findPinInfoContent() {
    return document.getElementById('pinInfoContent');
  }

  // Find pin info toggle
  findPinInfoToggle() {
    return document.getElementById('togglePinInfo');
  }
}

// Creates the expandable pin details view below device rows
// Displays pin states with color-coded indicators
class PinDetailsRenderer {
  // Creates Pin Details Row
  createPinDetailsRow(deviceId, pins) {
    const tr = document.createElement('tr');
    tr.className = DeviceConfig.CSS_CLASSES.PIN_DETAILS_ROW;
    tr.dataset.deviceId = deviceId;

    const td = document.createElement('td');
    td.colSpan = 6;

    const container = this._createContainer(pins);
    td.appendChild(container);
    tr.appendChild(td);

    return tr;
  }

  // Creates Pin Container
  _createContainer(pins) {
    const container = document.createElement('div');
    container.className = 'pin-details-container';

    const pinEntries = Object.entries(pins);

    // Header
    const header = this._createHeader(pinEntries.length);
    container.appendChild(header);

    // Content
    if (pinEntries.length === 0) {
      container.appendChild(this._createEmptyMessage());
    } else {
      container.appendChild(this._createPinsGrid(pinEntries));
    }

    return container;
  }

  // Creates Header
  _createHeader(pinCount) {
    const header = document.createElement('div');
    header.className = 'pin-details-header';
    
    const titleContainer = document.createElement('div');
    titleContainer.className = 'pin-details-title';
    titleContainer.innerHTML = `
      <div class="pin-title-text">
        <i data-feather="cpu"></i>
        <span>Pin Configuration</span>
      </div>
      <span class="pin-count-badge">${pinCount}</span>
    `;
    
    header.appendChild(titleContainer);
    return header;
  }

  // Creates "No Pins" message
  _createEmptyMessage() {
    const noMsg = document.createElement('div');
    noMsg.className = 'no-pins-message';
    noMsg.innerHTML = '<div class="no-pins-content"><i data-feather="info"></i> No pins configured for this device</div>';
    return noMsg;
  }

  // Creates Pins Grid
  _createPinsGrid(pinEntries) {
    const grid = document.createElement('div');
    grid.className = 'pins-grid';

    pinEntries.forEach(([gpio, pin]) => {
      grid.appendChild(this._createPinCard(gpio, pin));
    });

    return grid;
  }

  // Creates individual Pin Card
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

  // Updates Pin Details content
  updatePinDetailsContent(pinRow, pins) {
    const td = pinRow.querySelector('td');
    if (!td) return;

    const newContainer = this._createContainer(pins);
    td.innerHTML = '';
    td.appendChild(newContainer);
  }
}

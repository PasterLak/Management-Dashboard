// Creates the HTML for individual device table rows
// Generates cells for status, ID, IP, description, last seen, and actions
class DeviceRowRenderer {
  constructor(dataService) {
    this.dataService = dataService;
  }

  formatLastSeenWithRate(lastSeenSource, nowMs, requestRateHz, isOffline) {
    const lastSeenDisplay = (window.TimeUtils && typeof window.TimeUtils.formatRelativeTime === 'function')
      ? window.TimeUtils.formatRelativeTime(lastSeenSource, nowMs)
      : (lastSeenSource || 'unknown');

    if (isOffline) {
      return lastSeenDisplay;
    }

    const safeRate = Number.isFinite(Number(requestRateHz)) ? Number(requestRateHz) : 0;
    const formattedRate = safeRate.toFixed(2);

    return `${lastSeenDisplay} (${formattedRate}/s)`;
  }

  // Creates a full table row
  createRow(rowData, offlineThreshold) {
    const tr = document.createElement('tr');
    tr.dataset.id = rowData.id;
    
    const lastSeenSource = (typeof rowData.timestamp === 'number') ? rowData.timestamp : rowData.last_seen;
    const threshold = offlineThreshold || DeviceDataService.DEFAULT_OFFLINE_THRESHOLD;
    const isOffline = (typeof rowData.offline === 'boolean')
      ? rowData.offline
      : this.dataService.isOffline({ last_seen: lastSeenSource }, threshold);
    const statusClass = isOffline ? 'device-status--offline' : 'device-status--online';
    const statusText = isOffline ? 'Offline' : 'Online ';
    const nowMs = this.dataService.getServerNow();
    const lastSeenDisplay = this.formatLastSeenWithRate(
      lastSeenSource,
      nowMs,
      rowData.request_rate_hz,
      isOffline,
    );
    
    tr.innerHTML = `
      <td class="status-cell" data-label="Status">
        <div class="device-status ${statusClass}">
          <span class="device-status-dot"></span>
          <span>${statusText}</span>
        </div>
      </td>
      <td data-label="ID">${rowData.id}</td>
      <td data-label="IP">${rowData.ip}</td>
      <td class="desc-cell" data-id="${rowData.id}" data-label="Description">
        <span class="desc-text">${rowData.description}</span>
      </td>
      <td data-label="Last Seen">${lastSeenDisplay}</td>
      <td class="actions-cell" data-label="Actions">
        <button class="edit-btn" type="button" data-id="${rowData.id}" aria-label="Edit description" data-tooltip="Edit Description">
          <i data-feather="edit-3"></i>
        </button>
        <button class="copy-btn" type="button" data-id="${rowData.id}" data-original-icon="copy" aria-label="Copy JSON" data-tooltip="Copy JSON">
          <i data-feather="copy"></i>
        </button>
        <button class="blink-btn ${rowData.blink ? 'blink-active' : ''}" type="button" data-id="${rowData.id}" aria-label="Toggle blink" data-tooltip="Blink Device">
          <i data-feather="sun"></i>
        </button>
        <button class="delete-btn" type="button" data-id="${rowData.id}" aria-label="Delete device" data-tooltip="Delete Device">
          <i data-feather="trash-2"></i>
        </button>
      </td>
    `;
    
    return tr;
  }

  // Creates "No Devices" message
  createEmptyRow() {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.style.textAlign = 'center';
    td.style.padding = '40px';
    td.style.color = 'var(--text)';
    td.textContent = 'No devices available. Devices will appear here when they connect.';
    tr.appendChild(td);
    return tr;
  }

  // Updates row data in-place
  updateRowInPlace(row, deviceData, offlineThreshold) {
    const cells = row.querySelectorAll('td');
    const threshold = offlineThreshold || DeviceDataService.DEFAULT_OFFLINE_THRESHOLD;

    // Update Status Badge (column 0)
    if (cells[DeviceConfig.COLUMNS.STATUS]) {
      const isOffline = this.dataService.isOffline(deviceData, threshold);
      this.updateStatusBadge(cells[DeviceConfig.COLUMNS.STATUS], isOffline);
    }

    // Update IP
    if (cells[DeviceConfig.COLUMNS.IP]) {
      cells[DeviceConfig.COLUMNS.IP].textContent = deviceData.ip;
    }

    // Update Description (only if not in edit mode)
    if (cells[DeviceConfig.COLUMNS.DESCRIPTION]) {
      const descSpan = cells[DeviceConfig.COLUMNS.DESCRIPTION].querySelector('.desc-text');
      if (descSpan && descSpan.textContent !== deviceData.description) {
        descSpan.textContent = deviceData.description;
      }
    }

    // Update Last Seen
    if (cells[DeviceConfig.COLUMNS.LAST_SEEN]) {
      const nowMs = this.dataService.getServerNow();
      const isOffline = this.dataService.isOffline(deviceData, threshold);
      const display = this.formatLastSeenWithRate(
        deviceData.last_seen,
        nowMs,
        Number(deviceData.request_rate_hz || 0),
        isOffline,
      );

      if (cells[DeviceConfig.COLUMNS.LAST_SEEN].textContent !== display) {
        cells[DeviceConfig.COLUMNS.LAST_SEEN].textContent = display;
      }
    }

    // Update Blink Button
    this.updateBlinkButton(row, deviceData.blink);
  }

  // Updates status badge
  updateStatusBadge(statusCell, isOffline) {
    const statusDiv = statusCell.querySelector('.device-status');
    if (!statusDiv) return;

    const statusText = statusDiv.querySelector('span:last-child');
    
    if (isOffline) {
      statusDiv.className = 'device-status device-status--offline';
      if (statusText) statusText.textContent = 'Offline';
    } else {
      statusDiv.className = 'device-status device-status--online';
      if (statusText) statusText.textContent = 'Online ';
    }
  }

  // Updates Blink Button status
  updateBlinkButton(row, isBlinking) {
    const blinkBtn = row.querySelector(DeviceConfig.BUTTONS.BLINK);
    if (blinkBtn) {
      blinkBtn.classList.toggle(DeviceConfig.CSS_CLASSES.BLINK_ACTIVE, isBlinking);
    }
  }
}

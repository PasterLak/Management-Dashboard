// Renders console logs with colored categories
// Classifies logs (error, warning, success, http) and handles auto-scrolling
const ConsoleRenderer = {
  lastSeenLogs: [], // Store last seen logs to detect changes
  maxVisibleLogs: 1000, // Default: show last 1000 logs (configurable via settings)
  clearTimestamp: null, // Track when clear was called (to filter logs)
  serverLogCountAtClear: null, // Track server log count when clear was called

  // Initialize with settings
  init(settingsManager) {
    if (settingsManager) {
      this.maxVisibleLogs = settingsManager.get('maxConsoleLines') || 1000;
    }
  },

  // Update settings
  updateSettings(settings) {
    if (settings.maxConsoleLines !== undefined) {
      this.maxVisibleLogs = settings.maxConsoleLines;
    }
  },

  // Load state from localStorage
  _loadState() {
    try {
      const saved = localStorage.getItem('consoleState');
      if (saved) {
        const state = JSON.parse(saved);
        this.lastSeenLogs = state.lastSeenLogs || [];
        this.clearTimestamp = state.clearTimestamp || null;
        this.serverLogCountAtClear = state.serverLogCountAtClear || null;
      }
    } catch (e) {
      console.warn('[Console] Failed to load state:', e);
    }
  },

  // Save state to localStorage
  _saveState() {
    try {
      const state = {
        lastSeenLogs: this.lastSeenLogs,
        clearTimestamp: this.clearTimestamp,
        serverLogCountAtClear: this.serverLogCountAtClear
      };
      localStorage.setItem('consoleState', JSON.stringify(state));
    } catch (e) {
      console.warn('[Console] Failed to save state:', e);
    }
  },

  classifyLogLine(line) {
    const lowerLine = line.toLowerCase();
    
    // Error patterns
    if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('traceback') || lowerLine.includes('failed')) {
      return ConsoleConfig.logTypes.ERROR;
    }
    
    // Warning patterns
    if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
      return ConsoleConfig.logTypes.WARNING;
    }
    
    // Success patterns
    if (lowerLine.includes('success') || lowerLine.includes(' * running on') || lowerLine.includes('started')) {
      return ConsoleConfig.logTypes.SUCCESS;
    }
    
    // HTTP requests (logger) - use specific color
    if (line.includes('GET ') || line.includes('POST ') || line.includes('PUT ') || line.includes('DELETE ')) {
      if (line.includes('" 200 ') || line.includes('" 304 ')) {
        return 'console-http-success';
      } else if (line.includes('" 4') || line.includes('" 5')) {
        return ConsoleConfig.logTypes.ERROR;
      }
      return 'console-http';
    }
    
    // Simulator logs - use specific color
    if (line.includes('[Simulator') || line.includes('Updated payload') || line.includes('Sent:')) {
      return 'console-simulator';
    }
    
    // Info patterns
    if (lowerLine.includes('info') || lowerLine.startsWith(' * ')) {
      return ConsoleConfig.logTypes.INFO;
    }
    
    return ConsoleConfig.logTypes.DEFAULT;
  },

  createLogElement(line) {
    const logLine = document.createElement('div');
    logLine.className = 'console-line ' + this.classifyLogLine(line);
    logLine.textContent = line;
    return logLine;
  },

  appendLog(line) {
    if (!ConsoleDOM.output) return;

    // Check if at bottom before adding
    const isAtBottom = this._isScrolledToBottom(ConsoleDOM.output);

    // Add new log at bottom
    const logLine = this.createLogElement(line);
    ConsoleDOM.output.appendChild(logLine);

    // Remove oldest log from top if exceeding limit
    while (ConsoleDOM.output.children.length > this.maxVisibleLogs) {
      ConsoleDOM.output.removeChild(ConsoleDOM.output.firstChild);
    }

    // Auto-scroll only if was at bottom
    if (isAtBottom) {
      this.scrollToBottom();
    }
    
    // Update scroll button visibility
    this.updateScrollButton();
  },

  findNewLogs(currentLogs) {
    if (this.lastSeenLogs.length === 0) {
      // First time: return all logs
      return currentLogs;
    }

    // Find where the overlap starts
    // Get last log from last seen
    const lastSeenLog = this.lastSeenLogs[this.lastSeenLogs.length - 1];
    
    // Find index of last seen log in current logs
    const overlapIndex = currentLogs.lastIndexOf(lastSeenLog);
    
    if (overlapIndex === -1) {
      // No overlap found - completely different logs (server cleared)
      return currentLogs;
    }
    
    // Return only new logs after the overlap
    const newLogs = currentLogs.slice(overlapIndex + 1);
    
    return newLogs;
  },

  renderLogs(logs) {
    if (!logs || logs.length === 0) return;

    // Remove placeholder if it exists (before checking if DOM is empty)
    if (ConsoleDOM.output) {
      const placeholder = ConsoleDOM.output.querySelector('.console-info');
      if (placeholder && placeholder.textContent.includes('Waiting for server logs')) {
        placeholder.remove();
      }
    }

    // Set server count after clear (for filtering on reload)
    this.setServerCountAtClear(logs.length);

    // Filter logs if we have a clear timestamp - only show logs AFTER the clear point
    let filteredLogs = logs;
    if (this.serverLogCountAtClear !== null) {
      if (logs.length < this.serverLogCountAtClear) {
        this.serverLogCountAtClear = null;
        this.clearTimestamp = null;
        this._saveState();
      } else {
        const logsAfterClear = logs.length - this.serverLogCountAtClear;
        filteredLogs = logs.slice(-logsAfterClear);
      }
    }

    // Check if DOM is empty (after reload or clear)
    const isDOMEmpty = !ConsoleDOM.output || ConsoleDOM.output.children.length === 0;

    // Find only the new logs (only if DOM has content)
    const newLogs = isDOMEmpty ? filteredLogs : this.findNewLogs(filteredLogs);
    
    if (newLogs.length === 0) {
      // No new logs
      return;
    }

    // First load OR reload after clear: show last 100 logs
    if (isDOMEmpty) {
      // Clear placeholder if any
      if (ConsoleDOM.output) {
        ConsoleDOM.output.innerHTML = '';
      }
      
      // Get last 100 logs from filtered logs (configurable in settings)
      const recentLogs = filteredLogs.slice(-this.maxVisibleLogs);
      recentLogs.forEach(log => {
        const logLine = this.createLogElement(log);
        ConsoleDOM.output.appendChild(logLine);
      });
      
      this.scrollToBottom();
    } else {
      // Append only new logs
      newLogs.forEach(log => this.appendLog(log));
    }
    
    // Update last seen logs (keep last 100 from filtered logs - configurable in settings)
    this.lastSeenLogs = filteredLogs.slice(-this.maxVisibleLogs);
    
    // Save state to survive reloads
    this._saveState();
  },

  clear() {
    // server log count is used to filter correctly after reload
    this.needsServerCount = true;
    
    if (ConsoleDOM.output) {
      ConsoleDOM.output.innerHTML = '';
      // Add placeholder message
      const placeholder = document.createElement('div');
      placeholder.className = 'console-line console-info';
      placeholder.textContent = 'Waiting for server logs...';
      ConsoleDOM.output.appendChild(placeholder);
      
      // Mark clear timestamp
      this.clearTimestamp = Date.now();
    }
    this.updateScrollButton();
  },

  // Call this after clear to set the server count
  setServerCountAtClear(count) {
    if (this.needsServerCount) {
      this.serverLogCountAtClear = count;
      this.needsServerCount = false;
      this._saveState();
    }
  },

  scrollToBottom() {
    if (ConsoleDOM.output) {
      ConsoleDOM.output.scrollTop = ConsoleDOM.output.scrollHeight;
    }
  },

  updateScrollButton() {
    if (!ConsoleDOM.scrollBtn || !ConsoleDOM.output) return;

    const isAtBottom = this._isScrolledToBottom(ConsoleDOM.output);
    ConsoleDOM.scrollBtn.classList.toggle('visible', !isAtBottom);
  },

  _isScrolledToBottom(element) {
    if (!element) return false;
    return element.scrollHeight - element.scrollTop <= element.clientHeight + 5;
  }
};

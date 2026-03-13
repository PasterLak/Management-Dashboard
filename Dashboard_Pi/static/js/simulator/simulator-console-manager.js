// Manages console output for each simulator card
// Updates text content and handles auto-scrolling behavior
class SimulatorConsoleManager {
  constructor(dom) {
    this.dom = dom;
    this.lastContent = {}; // Cache last content per simulator
  }

  // Update console output
  updateConsole(simId, text, forceScroll = false) {
    const consoleEl = this.dom.findConsoleOutput(simId);
    if (!consoleEl) return;

    // Skip update if content hasn't changed
    if (this.lastContent[simId] === text && !forceScroll) {
      return;
    }
    
    this.lastContent[simId] = text;

    const isAtBottom = this._isScrolledToBottom(consoleEl);
    const shouldScrollToBottom = isAtBottom || forceScroll;
    const savedScrollTop = consoleEl.scrollTop;
    
    // Update content
    consoleEl.textContent = text;
    
    // Apply scroll immediately
    if (shouldScrollToBottom) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    } else {
      consoleEl.scrollTop = savedScrollTop;
    }

    this.updateScrollButton(consoleEl);
  }

  // Update payload textarea
  updatePayload(simId, json) {
    const jsonEl = this.dom.findPayloadTextarea(simId);
    if (jsonEl) {
      jsonEl.value = json;
    }
  }

  // Scroll console to bottom
  scrollToBottom(consoleEl) {
    if (consoleEl) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  }

  // Update scroll button visibility
  updateScrollButton(consoleEl) {
    if (!consoleEl) return;

    const scrollBtn = this.dom.findScrollButton(consoleEl);
    if (!scrollBtn) return;

    const isAtBottom = this._isScrolledToBottom(consoleEl);
    scrollBtn.classList.toggle(SimulatorConfig.CSS_CLASSES.VISIBLE, !isAtBottom);
  }

  // Clear cache for specific simulator
  clearCache(simId) {
    delete this.lastContent[simId];
  }

  // Handle scroll button click
  handleScrollButtonClick(simId) {
    const consoleEl = this.dom.findConsoleOutput(simId);
    if (consoleEl) {
      this.scrollToBottom(consoleEl);
      const scrollBtn = this.dom.findScrollButton(consoleEl);
      if (scrollBtn) {
        scrollBtn.classList.remove(SimulatorConfig.CSS_CLASSES.VISIBLE);
      }
    }
  }

  // Check if scrolled to bottom
  _isScrolledToBottom(consoleEl) {
    if (!consoleEl) return false;
    return consoleEl.scrollHeight - consoleEl.scrollTop <= consoleEl.clientHeight + 5;
  }
}

// Renders the list of simulator cards on the page
// Updates the UI when simulators are added, removed, or changed
class SimulatorRenderer {
  constructor(dom, dataService, cardRenderer) {
    this.dom = dom;
    this.dataService = dataService;
    this.cardRenderer = cardRenderer;
    this.pendingScrolls = {}; // Track simulators that need scroll after render
    this.savedScrollPositions = {}; // Save scroll positions before re-render
  }

  // Render all simulators
  render() {
    if (!this.dom.isAvailable()) return;

    // Save page scroll position before re-render
    const pageScrollTop = window.scrollY || document.documentElement.scrollTop;

    const simulators = this.dataService.getAll();

    // Empty state
    if (simulators.length === 0) {
      this.dom.replaceListContent(this.cardRenderer.createEmptyMessage());
      return;
    }

    // Save scroll positions before clearing
    this._saveScrollPositions(simulators);

    // Clear and render cards
    this.dom.clearList();
    
    simulators.forEach(sim => {
      const card = this.cardRenderer.createCard(sim);
      card.style.animation = 'none';
      this.dom.appendCard(card);
      
      if (this.savedScrollPositions[sim.id] !== undefined) {
        const consoleEl = card.querySelector('.sim-console-output');
        if (consoleEl) {
          consoleEl.scrollTop = this.savedScrollPositions[sim.id];
        }
      }
      
      if (this.pendingScrolls[sim.id]) {
        const consoleEl = card.querySelector('.sim-console-output');
        if (consoleEl) {
          consoleEl.scrollTop = consoleEl.scrollHeight;
        }
        delete this.pendingScrolls[sim.id];
      }
    });

    // Replace feather icons to get svg
    if (window.feather) feather.replace();

    // Restore page scroll position after render
    requestAnimationFrame(() => {
      window.scrollTo(0, pageScrollTop);
    });
  }

  // Add a single new simulator card
  addCard(simId) {
    if (!this.dom.isAvailable()) return;

    const sim = this.dataService.getById(simId);
    if (!sim) return;

    // Check if empty state exists and fade it out
    const emptyMsg = this.dom.simulatorList?.querySelector('p');
    if (emptyMsg) {
      emptyMsg.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      emptyMsg.style.opacity = '0';
      emptyMsg.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        emptyMsg.remove();
        
        const card = this.cardRenderer.createCard(sim);
        this.dom.appendCard(card);

        if (window.feather) feather.replace();
      }, 200);
    } else {
      
      const card = this.cardRenderer.createCard(sim);
      this.dom.appendCard(card);

      if (window.feather) feather.replace();
    }
  }

  // Save scroll positions of all console outputs
  _saveScrollPositions(simulators) {
    simulators.forEach(sim => {
      const consoleEl = this.dom.findConsoleOutput(sim.id);
      if (consoleEl) {
        this.savedScrollPositions[sim.id] = consoleEl.scrollTop;
      }
    });
  }

  // Mark simulator for scroll on next render
  scheduleScroll(simId) {
    this.pendingScrolls[simId] = true;
  }

  // Remove a card with animation
  async removeCardWithAnimation(simId) {
    return new Promise((resolve) => {
      const cards = this.dom.simulatorList?.querySelectorAll('.simulator-card');
      if (!cards) {
        resolve();
        return;
      }

      let targetCard = null;
      
      cards.forEach(card => {
        const cardIdElement = card.querySelector('[data-id]');
        if (cardIdElement && cardIdElement.dataset.id == simId) {
          targetCard = card;
        }
      });

      if (!targetCard) {
        resolve();
        return;
      }

      const currentHeight = targetCard.offsetHeight;

      targetCard.classList.add('simulator-card--removing');

      setTimeout(() => {
        targetCard.style.height = currentHeight + 'px';
        targetCard.style.minHeight = '0';
        
        targetCard.offsetHeight;
        
        targetCard.classList.remove('simulator-card--removing');
        targetCard.classList.add('simulator-card--collapsing');
        targetCard.style.height = '0';
        
        setTimeout(() => {
          if (targetCard.parentNode) {
            targetCard.remove();
          }
          
          const remainingCards = this.dom.simulatorList?.querySelectorAll('.simulator-card');
          if (!remainingCards || remainingCards.length === 0) {
            const emptyMsg = this.cardRenderer.createEmptyMessage();
            this.dom.replaceListContent(emptyMsg);
            const msgEl = this.dom.simulatorList?.querySelector('p');
            if (msgEl) {
              msgEl.style.opacity = '0';
              msgEl.style.transform = 'translateY(-10px)';
              setTimeout(() => {
                msgEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                msgEl.style.opacity = '1';
                msgEl.style.transform = 'translateY(0)';
              }, 10);
            }
          }
          
          resolve();
        }, 200);
      }, 200);
    });
  }

  // Scroll to specific simulator
  scrollToSimulator(simId) {
    setTimeout(() => {
      const simCard = document.querySelector(`.${SimulatorConfig.CSS_CLASSES.CARD}`);
      if (simCard) {
        simCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}

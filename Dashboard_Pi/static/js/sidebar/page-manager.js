// Switches between different pages in the dashboard
// Saves the current page to localStorage
class PageManager {
  constructor(consoleManager = null) {
    this.consoleManager = consoleManager;
    this.currentPage = this.loadCurrentPage();
    this.pages = document.querySelectorAll('.page');
    this.sidebarItems = document.querySelectorAll('.sidebar-item');
  }

  loadCurrentPage() {
    try {
      return localStorage.getItem('dashboard_currentPage') || 'home';
    } catch (e) {
      console.error('Failed to load current page:', e);
      return 'home';
    }
  }

  show(pageName) {
    // Don't do anything if already on this page
    if (this.currentPage === pageName) return;
    
    // Find current and target pages
    const currentPageEl = document.querySelector(`.page[data-page="${this.currentPage}"]`);
    const targetPageEl = document.querySelector(`.page[data-page="${pageName}"]`);
    
    if (!targetPageEl) return;
    
    // Fade out current page
    if (currentPageEl) {
      currentPageEl.classList.add('page--fading-out');
      currentPageEl.classList.remove('page--active');
    }
    
    // Wait for fade out, then show new page
    setTimeout(() => {
      // Remove fading state and hide old page
      if (currentPageEl) {
        currentPageEl.classList.remove('page--fading-out');
      }
      
      // Show and fade in new page
      targetPageEl.classList.add('page--active');
      
      // Update current page
      this.currentPage = pageName;
      
      // Save to localStorage
      try {
        localStorage.setItem('dashboard_currentPage', pageName);
      } catch (e) {
        console.error('Failed to save current page:', e);
      }

      // Update sidebar active state
      this.sidebarItems.forEach(item => {
        const isActive = item.dataset.target === pageName;
        item.classList.toggle('sidebar-item--active', isActive);
      });

      // Activate/deactivate managers based on page
      if (pageName === 'console') {
        if (this.consoleManager) {
          this.consoleManager.activate();
        }
      } else {
        if (this.consoleManager) {
          this.consoleManager.deactivate();
        }
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Update icons
      if (window.feather) {
        feather.replace();
      }
    }, 300); // must match CSS transition duration
  }

  init() {
    // Setup click handlers
    this.sidebarItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.target;
        if (target) this.show(target);
      });
    });

    // Hide all pages first
    this.pages.forEach(page => {
      page.classList.remove('page--active');
    });

    // Show initial page without animation
    const initialPage = document.querySelector(`.page[data-page="${this.currentPage}"]`);
    if (initialPage) {
      initialPage.classList.add('page--active');
    }

    // Set initial sidebar active state
    this.sidebarItems.forEach(item => {
      const isActive = item.dataset.target === this.currentPage;
      item.classList.toggle('sidebar-item--active', isActive);
    });

    // Activate console if needed
    if (this.currentPage === 'console' && this.consoleManager) {
      this.consoleManager.activate();
    }
  }
}

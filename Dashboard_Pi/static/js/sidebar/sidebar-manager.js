// Controls the sidebar's open and closed state
// Manages CSS classes and toggle button interactions
class SidebarManager {
  constructor() {
    this.sidebar = document.getElementById('sidebar');
    this.toggle = document.getElementById('sidebarToggle');
    this.overlay = document.querySelector('.sidebar-overlay');
    this.isOpen = false;
    this.sidebarItems = document.querySelectorAll('.sidebar-item');
    this.activeIndicator = null;
  }

  createActiveIndicator() {
    // Create a visual sliding indicator
    this.activeIndicator = document.createElement('div');
    this.activeIndicator.className = 'sidebar-active-indicator';
    
    const itemsContainer = document.querySelector('.sidebar-items');
    if (itemsContainer) {
      itemsContainer.appendChild(this.activeIndicator);
    }
  }

  updateActiveIndicator() {
    const activeItem = document.querySelector('.sidebar-item--active');
    if (!activeItem || !this.activeIndicator) return;

    const containerRect = document.querySelector('.sidebar-items').getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    
    const offsetTop = itemRect.top - containerRect.top;
    
    this.activeIndicator.style.transform = `translateY(${offsetTop}px)`;
    this.activeIndicator.style.height = `${itemRect.height}px`;
  }

  open() {
    this.isOpen = true;
    this.sidebar.classList.add('sidebar--open');
    this.sidebar.classList.remove('sidebar--closed');
    if (window.feather) feather.replace();
  }

  close() {
    this.isOpen = false;
    this.sidebar.classList.remove('sidebar--open');
    this.sidebar.classList.add('sidebar--closed');
    if (window.feather) feather.replace();
  }

  toggleState() {
    this.isOpen ? this.close() : this.open();
  }

  init() {
    if (!this.sidebar || !this.toggle) return;

    // Create and setup active indicator
    this.createActiveIndicator();
    
    // Initial position
    setTimeout(() => this.updateActiveIndicator(), 100);

    // Watch for sidebar item changes
    const observer = new MutationObserver(() => {
      this.updateActiveIndicator();
    });

    this.sidebarItems.forEach(item => {
      observer.observe(item, { attributes: true, attributeFilter: ['class'] });
    });

    // Toggle button click
    this.toggle.addEventListener('click', () => {
      this.toggleState();
    });

    // Click overlay to close
    if (this.overlay) {
      this.overlay.addEventListener('click', () => {
        this.close();
      });
    }

   
  }
}

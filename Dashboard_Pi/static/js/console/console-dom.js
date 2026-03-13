// Finds and caches DOM elements for the console page
// Provides quick access to output area, clear button, and scroll button
const ConsoleDOM = {
  output: null,
  clearBtn: null,
  scrollBtn: null,

  init() {
    this.output = document.getElementById('consoleOutput');
    this.clearBtn = document.getElementById('consoleClearBtn');
    this.scrollBtn = document.getElementById('consoleScrollBtn');
  }
};

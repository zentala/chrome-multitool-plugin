class LogViewer {
  private static instance: LogViewer | null = null;
  private logContainer: HTMLDivElement | null = null;
  private logs: string[] = [];
  private logBuffer: string[] = [];

  constructor() {
    // Singleton pattern
    if (LogViewer.instance) {
      return LogViewer.instance;
    }
    LogViewer.instance = this;
    
    this.interceptConsole();
    this.init();
    this.log('LogViewer: Zainicjalizowany', 'info');
  }

  private interceptConsole(): void {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      if (this.logContainer) {
        this.log(message, 'info');
      } else {
        this.logBuffer.push(message);
      }
      originalConsoleLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (this.logContainer) {
        this.log(message, 'error');
      } else {
        this.logBuffer.push(`[ERROR] ${message}`);
      }
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      if (this.logContainer) {
        this.log(message, 'warning');
      } else {
        this.logBuffer.push(`[WARN] ${message}`);
      }
      originalConsoleWarn.apply(console, args);
    };
  }

  private createLogContainer(): void {
    try {
      this.logContainer = document.createElement('div');
      this.logContainer.id = 'allegro-debug-logger';
      this.logContainer.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 400px !important;
        max-height: 300px !important;
        background-color: rgba(0, 0, 0, 0.9) !important;
        color: #fff !important;
        font-family: monospace !important;
        padding: 10px !important;
        border-radius: 5px !important;
        z-index: 9999 !important;
        overflow-y: auto !important;
        font-size: 12px !important;
        display: block !important;
        pointer-events: auto !important;
        visibility: visible !important;
        opacity: 1 !important;
        border: 2px solid #444 !important;
      `;

      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        border-bottom: 1px solid #555;
        padding-bottom: 5px;
      `;

      const title = document.createElement('span');
      title.textContent = 'Debug Logger';

      const copyButton = document.createElement('button');
      copyButton.textContent = 'Kopiuj';
      copyButton.style.cssText = `
        background: #444;
        border: none;
        color: white;
        padding: 2px 8px;
        border-radius: 3px;
        cursor: pointer;
      `;
      copyButton.onclick = () => this.copyLogs();

      const clearButton = document.createElement('button');
      clearButton.textContent = 'Wyczyść';
      clearButton.style.cssText = copyButton.style.cssText;
      clearButton.style.marginLeft = '5px';
      clearButton.onclick = () => this.clearLogs();

      header.appendChild(title);
      const buttonContainer = document.createElement('div');
      buttonContainer.appendChild(copyButton);
      buttonContainer.appendChild(clearButton);
      header.appendChild(buttonContainer);

      this.logContainer.appendChild(header);
      document.body.appendChild(this.logContainer);
      console.log('LogViewer: Kontener dodany do DOM');
    } catch (error) {
      console.error('LogViewer: Błąd podczas tworzenia kontenera:', error);
    }
  }

  private copyLogs(): void {
    const logText = this.logs.join('\n');
    navigator.clipboard.writeText(logText)
      .then(() => this.log('Logi skopiowane do schowka'))
      .catch(err => this.log('Błąd podczas kopiowania: ' + err));
  }

  private clearLogs(): void {
    this.logs = [];
    if (this.logContainer) {
      const header = this.logContainer.firstChild;
      this.logContainer.innerHTML = '';
      if (header) {
        this.logContainer.appendChild(header);
      }
    }
  }

  public log(message: string, type: 'info' | 'error' | 'warning' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);

    if (!this.logContainer) {
      this.createLogContainer();
    }

    const logEntry = document.createElement('div');
    logEntry.style.cssText = `
      margin: 2px 0;
      padding: 2px 0;
      border-bottom: 1px solid #333;
    `;

    switch (type) {
      case 'error':
        logEntry.style.color = '#ff6b6b';
        break;
      case 'warning':
        logEntry.style.color = '#ffd93d';
        break;
      default:
        logEntry.style.color = '#fff';
    }

    logEntry.textContent = logMessage;
    this.logContainer?.appendChild(logEntry);

    // Auto-scroll to bottom
    if (this.logContainer) {
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
  }

  public init(): void {
    this.createLogContainer();
    
    if (this.logBuffer.length > 0) {
      this.logBuffer.forEach(message => {
        this.log(message, 'info');
      });
      this.logBuffer = [];
    }
  }
}

export const logViewer = new LogViewer(); 
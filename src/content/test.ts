// Typy dla logów
interface DebugLog {
  time: string;
  message: string;
}

// 1. Użyjmy alertów zamiast console.log
alert('Start loading!');

// 2. Dodajmy element debugowania do DOM
function addDebugInfo(text: string): void {
  const debugDiv = document.createElement('div');
  debugDiv.textContent = `[DEBUG] ${text}`;
  debugDiv.style.cssText = `
    position: fixed;
    left: 10px;
    background: black;
    color: lime;
    padding: 5px;
    font-family: monospace;
    z-index: 999999;
  `;
  
  const existingLogs = document.querySelectorAll('[data-debug-log]').length;
  debugDiv.style.top = `${10 + (existingLogs * 30)}px`;
  debugDiv.setAttribute('data-debug-log', 'true');
  
  document.documentElement.appendChild(debugDiv);
}

// 3. Użyjmy localStorage do debugowania
function logToStorage(message: string): void {
  const logs: DebugLog[] = JSON.parse(localStorage.getItem('zentalaDebugLogs') || '[]');
  logs.push({
    time: new Date().toISOString(),
    message
  });
  localStorage.setItem('zentalaDebugLogs', JSON.stringify(logs));
}

// 4. Spróbujmy różnych momentów wykonania
try {
  // Natychmiast
  addDebugInfo('Script started');
  logToStorage('Script started');
  
  // Po małym opóźnieniu
  setTimeout(() => {
    addDebugInfo('After 1s timeout');
    logToStorage('After 1s timeout');
    
    // Dodaj czerwony element testowy
    const testDiv = document.createElement('div');
    testDiv.textContent = 'TEST ELEMENT';
    testDiv.style.cssText = `
      position: fixed;
      top: 50%;
      right: 10px;
      background: red;
      color: white;
      padding: 20px;
      z-index: 999999;
    `;
    document.documentElement.appendChild(testDiv);
  }, 1000);
  
  // Po DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    addDebugInfo('DOMContentLoaded fired');
    logToStorage('DOMContentLoaded fired');
  });
  
  // Po load
  window.addEventListener('load', () => {
    addDebugInfo('Window loaded');
    logToStorage('Window loaded');
  });
  
} catch (error: unknown) {
  // Poprawna obsługa błędu z TypeScript
  if (error instanceof Error) {
    alert(`Error: ${error.message}`);
  } else {
    alert('An unknown error occurred');
  }
}

// 5. Dodaj przycisk do wyświetlenia logów
setTimeout(() => {
  const button = document.createElement('button');
  button.textContent = 'Show Debug Logs';
  button.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: lime;
    color: black;
    padding: 10px;
    z-index: 999999;
  `;
  
  button.addEventListener('click', () => {
    const logs: DebugLog[] = JSON.parse(localStorage.getItem('zentalaDebugLogs') || '[]');
    const logsContainer = document.createElement('div');
    logsContainer.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: black;
      color: lime;
      padding: 10px;
      z-index: 999999;
    `;
    
    logs.forEach((log, index) => {
      const logItem = document.createElement('div');
      logItem.textContent = `${log.time}: ${log.message}`;
      logItem.style.cssText = `
        background: lime;
        color: black;
        padding: 5px;
        margin-bottom: 5px;
      `;
      
      logItem.style.top = `${10 + (index * 30)}px`;
      logItem.setAttribute('data-debug-log', 'true');
      
      logsContainer.appendChild(logItem);
    });
    
    document.documentElement.appendChild(logsContainer);
  });
  
  document.documentElement.appendChild(button);
}, 1000);
  
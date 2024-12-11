import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/main.scss';

const Popup: React.FC = () => {
  const openBookmarkManager = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('bookmarkManager.html')
    });
  };

  return (
    <div className="popup">
      <h1>Zentala Chrome Multitool</h1>
      <div>Custom shortcuts, automations, integrations and productivity tools</div>
      <div className="menu">
        <button 
          className="menu-item"
          onClick={openBookmarkManager}
        >
          <span className="material-icons">bookmarks</span>
          Bookmark Manager
        </button>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}

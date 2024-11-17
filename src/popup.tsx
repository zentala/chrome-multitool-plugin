import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/main.scss';

const Popup: React.FC = () => {
  return (
    <div className="popup">
      <h1>Zentala Chrome Multitool</h1>
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

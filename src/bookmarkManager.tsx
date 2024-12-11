import React from 'react';
import { createRoot } from 'react-dom/client';
import { BookmarkManagerApp } from './components/BookmarkManagerApp';

const container = document.getElementById('bookmark-manager-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BookmarkManagerApp />
    </React.StrictMode>
  );
} 
import React from 'react';
import { render } from 'react-dom';
import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import { theme } from './theme';
import { BookmarkManagerApp } from './components/BookmarkManagerApp';

const container = document.getElementById('root');
if (container) {
  render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BookmarkManagerApp />
      </ThemeProvider>
    </React.StrictMode>,
    container
  );
} 
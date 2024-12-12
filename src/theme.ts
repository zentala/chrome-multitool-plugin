import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    // h5: {
    //   fontFamily: '"IBM Plex Sans", sans-serif',
    //   fontWeight: 500,
    // },
    // body2: {
    //   fontFamily: '"IBM Plex Sans", sans-serif',
    // },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});
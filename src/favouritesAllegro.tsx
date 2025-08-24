import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "./theme";
import { FavouritesAllegroApp } from "./components/FavouritiesAllegro/App";

// Standard mount approach used by many React apps
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (!container) {
    console.error("Root container not found for FavouritesAllegroApp");
    return;
  }

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FavouritesAllegroApp />
      </ThemeProvider>
    </React.StrictMode>
  );
});

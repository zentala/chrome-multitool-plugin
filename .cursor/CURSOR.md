# Project Analysis: chrome-multitool-plugin

## Overview

This project is a Chrome browser extension named "Zentala Chrome Multitool Plugin" (manifest version 3). Its goal is to provide personal productivity tools, custom shortcuts, automations, and integrations directly within the browser.

## Technology Stack

- **Frontend:** React 19, TypeScript
- **UI Library:** Material UI (@mui/material, @mui/styles, @mui/system, @mui/icons-material, @mui/x-tree-view)
- **Styling:** SASS, CSS-in-JS (likely Emotion via MUI)
- **Bundling:** Webpack 5
- **Testing:** Jest
- **Linting/Formatting:** ESLint, Prettier
- **State Management/Logic:** Likely includes custom logic, potentially using Langchain (@langchain/core, @langchain/openai, @langchain/anthropic) based on dependencies.
- **Platform:** Chrome Extension API

## Key Features & Components (Inferred)

- **Popup UI (`popup.tsx`, `popup.html`):** The main interface accessible via the extension icon. Built with React and MUI.
- **Bookmark Manager (`bookmarkManager.tsx`, `bookmarkManager.html`):** A dedicated page (web accessible resource) for managing bookmarks, likely also built with React and MUI.
- **Background Script (`background/` directory, `background.js`):** Handles background tasks, event listening (e.g., tab updates, messages), and potentially manages long-running processes or API interactions.
- **Content Scripts (`content/` directory):** Scripts injected into specific web pages (currently configured for `allegro.pl` to inject Material Icons font).
- **API Integrations:**
    - OpenAI (`@langchain/openai`, `https://*.openai.com/*` permission)
    - Anthropic (`@anthropic-ai/sdk`, `@langchain/anthropic`, `https://*.anthropic.com/*` permission)
- **Permissions:** The extension requests permissions for:
    - `activeTab`: Access to the currently active tab.
    - `bookmarks`: Reading and modifying bookmarks.
    - `scripting`: Injecting scripts into pages.
    - `storage`: Storing extension data locally.
    - `tabs`: Accessing and managing browser tabs.
    - Access to Google Fonts API.
    - Access to OpenAI and Anthropic APIs.

## Project Structure

- **`src/`**: Contains all source code (TypeScript/TSX, SCSS).
    - `background/`: Background service worker logic.
    - `components/`: Reusable React components.
    - `content/`: Content script logic.
    - `popup.tsx`: Entry point for the popup UI.
    - `bookmarkManager.tsx`: Entry point for the bookmark manager page.
    - `services/`: Likely contains API interaction logic (OpenAI, Anthropic, Chrome APIs).
    - `styles/`: Global styles or SASS partials.
    - `theme.ts`: Material UI theme configuration.
    - `types/`: TypeScript type definitions.
    - `utils/`: Utility functions.
- **`public/`**: Static assets and templates.
    - `popup.html`, `bookmarkManager.html`: HTML templates used by Webpack.
    - `manifest.json`: Source manifest file copied during build.
- **`dist/`**: Build output directory. Contains compiled JavaScript, HTML, and the final `manifest.json`.
- **Configuration Files:**
    - `package.json`: Project metadata, dependencies, scripts.
    - `tsconfig.json`: TypeScript compiler options.
    - `webpack.config.js`: Webpack build configuration.
    - `.gitignore`: Files/directories ignored by Git.
    - `manifest.json` (root): Seems redundant if `public/manifest.json` is the source.
    - `README.md`: Project description and setup instructions.

## Build Process

- Webpack bundles `popup.tsx` and `bookmarkManager.tsx` into `popup.js` and `bookmarkManager.js` respectively, placing them in `dist/`.
- TypeScript is compiled using `ts-loader`.
- SCSS files are processed using `sass-loader`, `css-loader`, and `style-loader`.
- `HtmlWebpackPlugin` generates `popup.html` and `bookmarkManager.html` in `dist/`, injecting the corresponding JS bundles.
- `CopyPlugin` copies `public/manifest.json` to `dist/`.
- Vendor libraries are split into a separate `vendors.js` chunk for better caching.
- Scripts available: `npm run build` (production), `npm run dev` (development with watch), `npm test`, `npm run lint`.

## Potential Next Steps/Areas to Explore

- Examine the code within `src/background`, `src/services`, `src/components`, `src/popup.tsx`, and `src/bookmarkManager.tsx` to understand the specific implementations of features.
- Review the usage of Langchain and the AI SDKs (OpenAI, Anthropic).
- Understand how custom shortcuts and automations are implemented (likely in `background.js` using Chrome APIs).
- Check the `content/` scripts for any further interactions with web pages.
- Clarify the purpose of the root `manifest.json` vs `public/manifest.json`. 
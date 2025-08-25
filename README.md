# Zentala Chrome Multitool Plugin

![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black)
![Webpack](https://img.shields.io/badge/-Webpack-8DD6F9?logo=webpack&logoColor=black)
![Chrome](https://img.shields.io/badge/-Chrome_Extension-4285F4?logo=googlechrome&logoColor=white)
![SASS](https://img.shields.io/badge/-SASS-CC6699?logo=sass&logoColor=white)
![Jest](https://img.shields.io/badge/-Jest-C21325?logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/-ESLint-4B32C3?logo=eslint&logoColor=white)

Personal browser extension with custom shortcuts, automations, integrations and productivity tools.

## 🏗️ Architecture Decisions

### Manifest Version: V2 vs V3
📄 **[ADR 001: Use Manifest V2 instead of Manifest V3](ADR/001-manifest-v2-over-v3.md)**

**Why MV2?** Playwright has limited support for MV3 service workers. We use MV2 for reliable E2E testing and will migrate to MV3 when Playwright support improves.

### E2E Testing: Always headless: false
📄 **[ADR 002: Always Use headless: false for Extension E2E Tests](ADR/002-always-headless-false-for-extension-testing.md)**

**Why always headful?** Chrome Extensions cannot load in headless mode. Use `xvfb-run` for CI environments.

## 🚀 Features

- Custom keyboard shortcuts
- Browser automation tools
- Personal productivity integrations
- Quick access tools

## 🛠️ Tech Stack

- **Core:** TypeScript, React
- **Bundling:** Webpack
- **Styling:** SASS
- **Testing:** Jest
- **Code Quality:** ESLint, Prettier
- **Platform:** Chrome Extension API

## 🏗️ Installation

```bash
pnpm install
pnpm run build
pnpm run dev
pnpm test
pnpm run lint
```
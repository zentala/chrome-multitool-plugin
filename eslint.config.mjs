import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";


export default defineConfig([
  // Global ignores - applied first
  { 
    ignores: ["dist/", "package-lock.json"], 
  },
  // General JS/TS/React config (Browser env)
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], languageOptions: { globals: globals.browser } },
  // Specific config for JS config files (Node env)
  {
    files: ["*.config.js"], // Target webpack.config.js, jest.config.js, etc.
    languageOptions: {
      globals: {
        ...globals.node, // Add Node.js globals like require, module, process, __dirname
      }
    }
  },
  // TypeScript config (applied only to TS files)
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  // React config (applied to JS/JSX/TS/TSX)
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // JSON/Markdown/CSS configs
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended"] },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
    rules: {
      "markdown/no-missing-label-refs": "off",
    }
  },
  { files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"] },
]);
# VS Code Tasks

This directory contains VS Code configuration files for the project.

## Available Tasks

### Build Tasks
- **`build`** (Ctrl+Shift+B) - Production build with webpack
- **`dev`** - Development build with file watching (background task)

### Test Tasks
- **`test`** (Ctrl+Shift+T) - Run all tests once with Vitest
- **`test:watch`** - Run tests in watch mode (background task)

### Code Quality Tasks
- **`lint`** - Run ESLint to check code quality
- **`lint:fix`** - Run ESLint with automatic fixes

## Usage

1. Open Command Palette (Ctrl+Shift+P)
2. Type "Tasks: Run Task"
3. Select the desired task from the list

Alternatively, you can use the keyboard shortcuts or access tasks through the Terminal menu.

## Task Configuration

- **build** and **dev** are grouped under "Build tasks"
- **test** and **test:watch** are grouped under "Test tasks"
- **lint** and **lint:fix** are grouped under "Build tasks"
- Background tasks (dev, test:watch) run continuously and show output in a shared panel

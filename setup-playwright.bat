@echo off
echo 🚀 Setting up Playwright for Chrome Extension E2E Testing...
echo.

echo 📦 Installing Playwright...
pnpm add -D @playwright/test @playwright/test-chrome-extension
if %errorlevel% neq 0 (
    echo ❌ Failed to install Playwright
    exit /b 1
)
echo ✅ Playwright installed successfully
echo.

echo 🌐 Installing browsers...
npx playwright install --with-deps
if %errorlevel% neq 0 (
    echo ❌ Failed to install browsers
    exit /b 1
)
echo ✅ Browsers installed successfully
echo.

echo 📋 Creating test directories...
if not exist "tests\e2e" mkdir tests\e2e
if not exist "tests\fixtures" mkdir tests\fixtures
if not exist "test-results" mkdir test-results
echo ✅ Test directories created
echo.

echo 🔧 Building extension...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build extension
    echo Please make sure your extension builds correctly first
    exit /b 1
)
echo ✅ Extension built successfully
echo.

echo 🎯 Setup complete! Run tests with:
echo   npm run test:e2e          - Run all E2E tests
echo   npm run test:e2e:headed   - Run with browser visible
echo   npm run test:e2e:debug    - Debug mode
echo   npm run test:e2e:ui       - Visual test runner
echo.

echo 📚 Useful commands:
echo   npx playwright show-report    - Show test report
echo   npx playwright test --list    - List all tests
echo   npx playwright test --grep "currency" - Run specific tests
echo.

echo 🎉 Ready to test your Chrome Extension!

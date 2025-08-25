@echo off
echo 🚀 Playwright E2E Tests - After Extension Loading Fix
echo.

echo 📋 Checking if extension is built...
if not exist "dist\manifest.json" (
    echo ❌ Extension not built. Building...
    npm run build
    if errorlevel 1 (
        echo ❌ Build failed
        exit /b 1
    )
) else (
    echo ✅ Extension already built
)

echo.
echo 🎯 Running Playwright tests...
echo.

echo 1. Basic extension loading test:
npm run test:e2e:currency -- --grep "extension popup loads correctly"

if errorlevel 1 (
    echo ❌ Basic test failed
    goto :error
)

echo.
echo ✅ Basic test passed! Running full currency converter tests...
npm run test:e2e:currency

if errorlevel 1 (
    echo ❌ Currency tests failed
    goto :error
)

echo.
echo ✅ Currency tests passed! Running Allegro integration tests...
npm run test:e2e:allegro

if errorlevel 1 (
    echo ❌ Allegro tests failed
    goto :error
)

echo.
echo 🎉 All tests passed! Generating report...
npm run test:e2e:report

goto :success

:error
echo.
echo ❌ Some tests failed. Check the output above.
echo 📊 Opening last test report...
npm run test:e2e:report
exit /b 1

:success
echo.
echo 🎉 All E2E tests passed successfully!
echo 📊 Test report available at: http://localhost:9323
echo.

# 🧪 Test-Specific Cursor Rules

This directory contains Cursor Rules that apply **only to test files** and testing-related configurations.

## Purpose

Local test rules help maintain:
- **Project-specific test patterns** without cluttering global rules
- **Debugging guidelines** specific to E2E testing
- **Testing best practices** for this codebase
- **Context-aware documentation** for test development

## Rules Applied

### `testing.e2e.local.mdc`
- E2E testing commands and patterns
- Project-specific testing workflows
- File structure and organization

### `debugging.mdc`
- Troubleshooting guides for test failures
- Common error patterns and solutions
- Performance debugging techniques
- CI/CD specific debugging

## Scope

These rules apply to:
- `tests/e2e/**` - All E2E test files
- `tests/fixtures/**` - Test fixtures and helpers
- `playwright.config.ts` - Playwright configuration
- `playwright-report/**` - Test reports and artifacts
- `test-results/**` - Test result files

## Benefits

1. **Selective Application**: Rules apply only where relevant
2. **Reduced Context Load**: Global rules stay focused on core development
3. **Project-Specific Guidance**: Test-specific patterns and practices
4. **Maintainable Documentation**: Easier to update test-specific information

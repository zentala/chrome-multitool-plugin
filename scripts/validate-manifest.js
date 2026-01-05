#!/usr/bin/env node

/**
 * Validates Chrome extension manifest.json after build
 * Checks for common Manifest V2 compatibility issues
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'dist', 'manifest.json');

function validateManifest() {
  console.log('🔍 Validating manifest.json...');

  // Check if dist/manifest.json exists
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ dist/manifest.json not found! Run build first.');
    process.exit(1);
  }

  // Read and parse manifest
  let manifest;
  try {
    const content = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to parse manifest.json:', error.message);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  // Check manifest version
  if (manifest.manifest_version !== 2) {
    errors.push(`❌ manifest_version should be 2 for V2 compatibility, got: ${manifest.manifest_version}`);
  }

  // Check content_security_policy format (V2 should be string, not object)
  if (typeof manifest.content_security_policy === 'object') {
    errors.push('❌ content_security_policy should be a string in Manifest V2, not an object');
  } else if (typeof manifest.content_security_policy !== 'string') {
    errors.push('❌ content_security_policy should be a string');
  }

  // Check web_accessible_resources format (V2 should be array of strings)
  if (manifest.web_accessible_resources) {
    if (!Array.isArray(manifest.web_accessible_resources)) {
      errors.push('❌ web_accessible_resources should be an array');
    } else {
      manifest.web_accessible_resources.forEach((resource, index) => {
        if (typeof resource === 'object') {
          errors.push(`❌ web_accessible_resources[${index}] should be a string in Manifest V2, not an object`);
        } else if (typeof resource !== 'string') {
          errors.push(`❌ web_accessible_resources[${index}] should be a string`);
        }
      });
    }
  }

  // Check required fields
  const required = ['name', 'version', 'manifest_version'];
  required.forEach(field => {
    if (!manifest[field]) {
      errors.push(`❌ Missing required field: ${field}`);
    }
  });

  // Check background script (V2 should use scripts array, not service_worker)
  if (manifest.background) {
    if (manifest.background.service_worker) {
      errors.push('❌ service_worker is for Manifest V3, use scripts array for V2');
    }
    if (!manifest.background.scripts || !Array.isArray(manifest.background.scripts)) {
      warnings.push('⚠️ background.scripts should be an array for V2');
    }
  }

  // Check permissions
  if (manifest.permissions && !Array.isArray(manifest.permissions)) {
    errors.push('❌ permissions should be an array');
  }

  // Check content_scripts
  if (manifest.content_scripts) {
    if (!Array.isArray(manifest.content_scripts)) {
      errors.push('❌ content_scripts should be an array');
    } else {
      manifest.content_scripts.forEach((script, index) => {
        if (!script.matches || !Array.isArray(script.matches)) {
          errors.push(`❌ content_scripts[${index}].matches should be an array`);
        }
        if (!script.js || !Array.isArray(script.js)) {
          errors.push(`❌ content_scripts[${index}].js should be an array`);
        }
      });
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error('\n❌ Validation failed with errors:');
    errors.forEach(error => console.error(`  ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️ Validation completed with warnings:');
    warnings.forEach(warning => console.warn(`  ${warning}`));
  }

  console.log('✅ Manifest validation passed!');
  return true;
}

// Run validation if called directly
if (require.main === module) {
  validateManifest();
}

module.exports = { validateManifest };

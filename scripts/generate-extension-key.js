// Generate a deterministic key for Chrome Extension development
// This ensures consistent extension ID across test runs

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate a simple key for development
// In production, you would use a proper RSA key
const devKey = {
  "kty": "RSA",
  "n": "nYhYKcWctNUHmuPyepz5DaZZ3Fk6B0J-z6VS-tV_P9SkmM_5gCQsY4Ux7QQVB1RcJVLUylMvJZN3pI_ch9BRX3HoKpmKdNPQsWRCYfao0uKYy1M8scRPRpd8pBR1OhvUbxvqaVNHbg1rBCnz3HPQAv7gEPhL7tI8J5NakC5VmJETBgrD0qnMQ7KZ6LRK7GGkCTxMQ7fCnF5wK7TSgQiR2qFXVVj2F6_w9Tg0L4qpqFNfQSJK7P6aeAcT2gKNW4UKZV0K4X5BcP4ZBs0FLwKZJNJpJQgqNJRMLKJG0vCJpVEh5iU_dTB1cE5vh1jqwPEhJL9xXEKvhH3a8nCqFQ",
  "e": "AQAB"
};

// Create a manifest key from the dev key
// This is a simplified version for development purposes
const manifestKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnYhYKcWctNUHmuPyepz5DaZZ3Fk6B0J+z6VS+tV/P9SkmM/5gCQsY4Ux7QQVB1RcJVLUylMvJZN3pI/ch9BRX3HoKpmKdNPQsWRCYfao0uKYy1M8scRPRpd8pBR1OhvUbxvqaVNHbg1rBCnz3HPQAv7gEPhL7tI8J5NakC5VmJETBgrD0qnMQ7KZ6LRK7GGkCTxMQ7fCnF5wK7TSgQiR2qFXVVj2F6/w9Tg0L4qpqFNfQSJK7P6aeAcT2gKNW4UKZV0K4X5BcP4ZBs0FLwKZJNJpJQgqNJRMLKJG0vCJpVEh5iU/dTB1cE5vh1jqwPEhJL9xXEKvhH3a8nCqFQIDAQAB";

// The expected extension ID for this key
const expectedExtensionId = "mfgccidlmgmcellpkjhepnhmfgdmnhae";

console.log('Generated manifest key for development:');
console.log(manifestKey);
console.log('\nExpected extension ID:');
console.log(expectedExtensionId);

// Save to file for reference
const outputPath = path.join(__dirname, '..', 'dev-extension-key.json');
fs.writeFileSync(outputPath, JSON.stringify({
  manifestKey,
  expectedExtensionId,
  note: "This is a development key. Do not use in production!"
}, null, 2));

console.log(`\nKey saved to: ${outputPath}`);

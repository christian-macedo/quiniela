#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TRANSLATION_FILES = [
  'messages/en.json',
  'messages/es.json'
];

let hasErrors = false;

console.log('🔍 Validating translation files...\n');

TRANSLATION_FILES.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  try {
    if (!fs.existsSync(filePath)) {
      console.error(`✗ ${file} does not exist`);
      hasErrors = true;
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    console.log(`✓ ${file} is valid JSON`);
  } catch (error) {
    console.error(`✗ ${file} has syntax errors:`);
    console.error(`  ${error.message}`);
    hasErrors = true;
  }
});

console.log('');

if (hasErrors) {
  console.error('❌ Translation validation failed\n');
  process.exit(1);
} else {
  console.log('✅ All translation files are valid\n');
  process.exit(0);
}

const fs = require('fs');
const path = require('path');

// Configuration
const baseFilePath = './theme-base.css';
const themeFilePaths = [
  './theme-casino.css',
  './theme-klublotto.css',
  './theme-oddset.css',
  './theme-numbergames.css',
  './theme-subscriptions.css',

]; // Add more themes as needed

// Extract CSS variables from a block of text
function extractCssVars(cssContent) {
  const varRegex = /--[a-zA-Z0-9-_]+:\s*[^;]+;/g;
  const matches = cssContent.match(varRegex) || [];
  const varMap = new Map();

  matches.forEach(line => {
    const [name] = line.split(':');
    varMap.set(name.trim(), line.trim());
  });

  return varMap;
}

// Read and parse base file
const baseContent = fs.readFileSync(baseFilePath, 'utf-8');

// Extract existing variables in the @theme block
const themeBlockRegex = /@theme\s*{([\s\S]*?)}/;
const themeMatch = baseContent.match(themeBlockRegex);

if (!themeMatch) {
  console.error('No @theme block found in base file.');
  process.exit(1);
}

const baseVarsMap = extractCssVars(themeMatch[1]);

// Extract variables from theme files
const allThemeVars = new Map();

themeFilePaths.forEach(themePath => {
  const themeContent = fs.readFileSync(themePath, 'utf-8');
  const themeVars = extractCssVars(themeContent);

  themeVars.forEach((line, name) => {
    if (!baseVarsMap.has(name) && !allThemeVars.has(name)) {
      allThemeVars.set(name, line);
    }
  });
});

// Combine new variables
const combinedVars = Array.from(baseVarsMap.values()).concat(Array.from(allThemeVars.values()));

const sortedVars = combinedVars.sort((a, b) => {
  const nameA = a.split(':')[0].trim();
  const nameB = b.split(':')[0].trim();
  return nameA.localeCompare(nameB);
});


const newThemeBlock = `@theme {\n  ${sortedVars.join('\n  ')}\n}`;

// Replace the old @theme block in the base content
const updatedBaseContent = baseContent.replace(themeBlockRegex, newThemeBlock);

// Write the result
fs.writeFileSync('./base.merged.css', updatedBaseContent, 'utf-8');
console.log('✅ Merged CSS variables into base.merged.css');

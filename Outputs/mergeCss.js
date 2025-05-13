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
  './theme-corporate.css',
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

// Extract keyframes blocks from CSS content and remove them from the content
function extractAndRemoveKeyframes(cssContent) {
  // This function uses a manual approach that properly handles nested curly braces in keyframes
  const keyframesMap = new Map();
  let modifiedContent = cssContent;
  
  // Find all positions where @keyframes definitions start
  const findKeyframeStartPositions = (content) => {
    const positions = [];
    const regex = /@keyframes\s+([a-zA-Z0-9\-_]+)\s*\{/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      positions.push({
        index: match.index,
        name: match[1].trim()
      });
    }
    
    return positions;
  };
  
  let keyframePositions = findKeyframeStartPositions(modifiedContent);
  
  // Process keyframes from end to beginning to avoid position shifts when removing content
  keyframePositions.sort((a, b) => b.index - a.index);
  
  keyframePositions.forEach(({ index, name }) => {
    let openBraces = 0;
    let closingIndex = -1;
    
    // Start from the position after @keyframes name {
    let i = modifiedContent.indexOf('{', index);
    
    while (i < modifiedContent.length) {
      if (modifiedContent[i] === '{') {
        openBraces++;
      } else if (modifiedContent[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
          closingIndex = i;
          break;
        }
      }
      i++;
    }
    
    if (closingIndex !== -1) {
      // Extract the complete keyframe block including the closing brace
      const keyframeBlock = modifiedContent.substring(index, closingIndex + 1);
      keyframesMap.set(name, keyframeBlock.trim());
      
      // Remove the keyframe block from the content
      modifiedContent = modifiedContent.substring(0, index) + modifiedContent.substring(closingIndex + 1);
    }
  });
  
  return { 
    keyframesMap,
    modifiedContent
  };
}

// Read base file
let baseContent = fs.readFileSync(baseFilePath, 'utf-8');

// First, extract all keyframes from the entire base content
const { keyframesMap: baseKeyframesMap, modifiedContent: baseContentWithoutKeyframes } = extractAndRemoveKeyframes(baseContent);

// Now extract the theme block from the modified content (without keyframes)
const themeBlockRegex = /@theme\s*{([\s\S]*?)}/;
const themeMatch = baseContentWithoutKeyframes.match(themeBlockRegex);

if (!themeMatch) {
  console.error('No @theme block found in base file.');
  process.exit(1);
}

// Extract CSS variables from theme block
const themeContent = themeMatch[1];
const baseVarsMap = extractCssVars(themeContent);

// Extract variables and keyframes from theme files
const allThemeVars = new Map();
const allKeyframes = new Map();

themeFilePaths.forEach(themePath => {
  const themeContent = fs.readFileSync(themePath, 'utf-8');
  
  // Extract and remove keyframes from theme content
  const { keyframesMap: themeKeyframesMap } = extractAndRemoveKeyframes(themeContent);
  
  // Extract CSS variables
  const themeVars = extractCssVars(themeContent);
  themeVars.forEach((line, name) => {
    if (!baseVarsMap.has(name) && !allThemeVars.has(name)) {
      allThemeVars.set(name, line);
    }
  });

  // Add keyframes if they don't exist in base or allKeyframes
  themeKeyframesMap.forEach((block, name) => {
    if (!baseKeyframesMap.has(name) && !allKeyframes.has(name)) {
      allKeyframes.set(name, block);
    }
  });
});

// Combine and sort CSS variables
const combinedVars = Array.from(baseVarsMap.values()).concat(Array.from(allThemeVars.values()));

const sortedVars = combinedVars.sort((a, b) => {
  const nameA = a.split(':')[0].trim();
  const nameB = b.split(':')[0].trim();
  return nameA.localeCompare(nameB);
});

// Combine and sort keyframes
const combinedKeyframes = Array.from(baseKeyframesMap.values())
  .concat(Array.from(allKeyframes.values()))
  .sort((a, b) => {
    const nameA = a.match(/@keyframes\s+([a-zA-Z0-9\-_]+)/)[1];
    const nameB = b.match(/@keyframes\s+([a-zA-Z0-9\-_]+)/)[1];
    return nameA.localeCompare(nameB);
  });

// Create the new theme block with both variables and keyframes
const newThemeBlock = `@theme {
  ${sortedVars.join('\n  ')}
  
  ${combinedKeyframes.join('\n\n  ')}
}`;

// Replace the old @theme block in the base content
const updatedBaseContent = baseContentWithoutKeyframes.replace(themeBlockRegex, newThemeBlock);

// Write the result
fs.writeFileSync('./base.merged.css', updatedBaseContent, 'utf-8');
console.log('✅ Merged CSS variables and keyframes into base.merged.css');
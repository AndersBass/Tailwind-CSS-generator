const { figmaToTailwind } = require('./property-mapping.js');
const fs = require('fs');
const path = require('path');

// Get the config file path from the command-line arguments
const configPath = process.argv[2];

if (!configPath) {
  console.error('Error: Please provide the path to the Tailwind config file as a parameter.');
  process.exit(1);
}

// Load the Tailwind config file
let config;
try {
  config = require(path.resolve(configPath));
} catch (error) {
  console.error(`Error: Unable to load the config file at "${configPath}".`);
  console.error(error.message);
  process.exit(1);
}

// Map property names using the mapping file
function mapPropertyName(section) {
  return figmaToTailwind.get(section) || section;
}

// Convert an object to CSS variables with mapped prefixes
function objectToCssVariables(obj, prefix = '') {
  let cssVariables = '';
  for (const [key, value] of Object.entries(obj)) {
    const mappedPrefix = mapPropertyName(prefix);
    const variableName = mappedPrefix ? `${mappedPrefix}-${key}` : key;

    if (typeof value === 'object' && !Array.isArray(value)) {
      cssVariables += objectToCssVariables(value, variableName);
    } else {
      if (mappedPrefix === 'text' && Array.isArray(value)) {
        // Handle fontSize specifically
        const [fontSize, options] = value;
        const lineHeight = options?.lineHeight || '1';
        cssVariables += `    --${variableName}: ${fontSize};\n`;
        cssVariables += `    --${variableName}--line-height: ${lineHeight};\n`;
      } else if (mappedPrefix === 'aspect-ratio') {
        // Handle aspectRatio specifically - meaning ignore the value
      } else if (mappedPrefix === 'animate') {
        // Handle animation specifically
        cssVariables += `    --${variableName}: ${value};\n`;
      } else {
        // Default case
        const formattedValue = Array.isArray(value) ? value[0] : value;
        cssVariables += `    --${variableName}: ${formattedValue};\n`;
      }
    }
  }
  return cssVariables;
}

// Extract custom variants from plugins
function extractCustomVariants(config) {
  let customVariants = '';

  console.log('Extracting custom variants from plugins...');
  
  if (config.plugins && Array.isArray(config.plugins)) {
    config.plugins.forEach(plugin => {
      try {
        // Handle different plugin formats
        let pluginStr = '';
        
        if (typeof plugin === 'function') {
          pluginStr = plugin.toString();
        } else if (plugin && typeof plugin.handler === 'function') {
          pluginStr = plugin.handler.toString();
        } else if (plugin && typeof plugin === 'object') {
          // Try to stringify the object for inspection
          pluginStr = JSON.stringify(plugin);
        }
        
        // If we have a plugin function that includes addVariant
        if (pluginStr && pluginStr.includes('addVariant')) {
          // Extract addVariant calls using regex
          const addVariantRegex = /addVariant\s*\(\s*['"]([^'"]+)['"]\s*,\s*(['"][^'"]+['"]|['"]([^'"]+)['"])\s*\)/g;
          let match;
          
          while ((match = addVariantRegex.exec(pluginStr)) !== null) {
            const variantName = match[1];
            const selector = match[2];
            customVariants += `@custom-variant ${variantName} (${selector});\n`;
          }
        }
      } catch (error) {
        console.warn('Error processing plugin:', error.message);
      }
    });
  }
  
  return customVariants;
}

// Generate the CSS content
function generateCss(config) {
  let cssContent = '';
  
  const className = config.selectors?.[0] || '.theme'; // Use the first selector as the class name or default
  cssContent += `@layer components {\n  ${className} {\n`;

  // Convert extend properties to CSS variables
  if (config.extend) {
    for (const [section, values] of Object.entries(config.extend)) {
      const prefix = mapPropertyName(section); // Map the section name
      
      // Special handling for animation
      if (section === 'animation' && typeof values === 'object') {
        for (const [animName, animValue] of Object.entries(values)) {
          cssContent += `    --animate-${animName}: ${animValue};\n`;
        }
      } else {
        cssContent += objectToCssVariables(values, prefix);
      }
    }
  }

  // Handle top-level animation config
  if (config.animation && typeof config.animation === 'object') {
    for (const [animName, animValue] of Object.entries(config.animation)) {
      cssContent += `    --animate-${animName}: ${animValue};\n`;
    }
  }

  // Add keyframes inside the class
  if (config.keyframes) {
    for (const [name, steps] of Object.entries(config.keyframes)) {
      cssContent += `    @keyframes ${name} {\n`;
      for (const [step, properties] of Object.entries(steps)) {
        cssContent += `      ${step} {\n`;
        for (const [prop, value] of Object.entries(properties)) {
          cssContent += `        ${prop}: ${value};\n`;
        }
        cssContent += `      }\n`;
      }
      cssContent += `    }\n`;
    }
  }

  cssContent += '  }\n}\n';

  // Extract custom variants
  const customVariants = extractCustomVariants(config);
  if (customVariants) {
    cssContent += '\n' + customVariants + '\n';
  }

  return cssContent;
}

// Ensure the Outputs folder exists
const outputDir = path.join(__dirname, '../Outputs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Write the CSS file to the Outputs folder
const cssContent = generateCss(config);
const outputPath = path.join(outputDir, `${config.name}.css`);
fs.writeFileSync(outputPath, cssContent);

console.log(`CSS file generated at: ${outputPath}`);
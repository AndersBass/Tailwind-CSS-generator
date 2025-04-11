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
        cssVariables += `  --${variableName}: ${fontSize};\n`;
        cssVariables += `  --${variableName}--line-height: calc(${lineHeight.replace('rem', '')} / ${fontSize.replace('rem', '')});\n`;
      } else {
        // Default case
        const formattedValue = Array.isArray(value) ? value[0] : value;
        cssVariables += `  --${variableName}: ${formattedValue};\n`;
      }
    }
  }
  return cssVariables;
}

// Convert keyframes to CSS
function keyframesToCss(keyframes) {
  let cssKeyframes = '';
  for (const [name, steps] of Object.entries(keyframes)) {
    cssKeyframes += `@keyframes ${name} {\n`;
    for (const [step, properties] of Object.entries(steps)) {
      cssKeyframes += `  ${step} {\n`;
      for (const [prop, value] of Object.entries(properties)) {
        cssKeyframes += `    ${prop}: ${value};\n`;
      }
      cssKeyframes += `  }\n`;
    }
    cssKeyframes += `}\n`;
  }
  return cssKeyframes;
}

// Generate the CSS content
function generateCss(config) {
  const className = config.selectors[0]; // Use the first selector as the class name
  let cssContent = `${className} {\n`;

  // Convert extend properties to CSS variables
  if (config.extend) {
    for (const [section, values] of Object.entries(config.extend)) {
      const prefix = mapPropertyName(section); // Map the section name
      cssContent += objectToCssVariables(values, prefix);
    }
  }

  // Add keyframes inside the class
  if (config.keyframes) {
    for (const [name, steps] of Object.entries(config.keyframes)) {
      cssContent += `  @keyframes ${name} {\n`;
      for (const [step, properties] of Object.entries(steps)) {
        cssContent += `    ${step} {\n`;
        for (const [prop, value] of Object.entries(properties)) {
          cssContent += `      ${prop}: ${value};\n`;
        }
        cssContent += `    }\n`;
      }
      cssContent += `  }\n`;
    }
  }

  cssContent += '}\n';

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
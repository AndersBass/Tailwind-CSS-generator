# Tailwind 3 config.js to Tailwind 4 CSS converter
## This script converts a Tailwind 3 config.js file to a Tailwind 4 CSS file.

## Usage:
- Download the script into a directory of your choice
- The file **property-mapping.js** contains the mapping of Tailwind 3 properties to Tailwind 4 properties. You can modify this file to add or remove properties as needed.
- Run the script using Node.js: `node ConvertToCSs <path_to_tailwind3_config.js>`
- The script will generate a `<theme-name.css>` file in the folder named Outputs in the same dicrectory.

- The generated CSS file will contain the Tailwind 4 CSS classes based on the Tailwind 3 config.js file.

*** Note: The script assumes that the Tailwind 3 config.js file is in the same format as the one generated by Tailwind 3. If the file is in a different format, the script may not work as expected.

**** Tailwind 4 needs all variables to have base value defined in a @theme block. The script will not take this into account, and you will have to make sure that where ever you are using a variable, it has a base value defined in the @theme block.
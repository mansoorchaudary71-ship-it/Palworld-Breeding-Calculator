import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../src/data.js');
let dataContent = fs.readFileSync(dataPath, 'utf8');

// The regex needs to handle spaces before the closing brace
const regex = /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*power:\s*(\d+)[^\}]*\}/g;

const updatedContent = dataContent.replace(regex, (match, id, name, power) => {
  const formattedName = name.replace(/\s+/g, '+');
  const image = `https://placehold.co/100x100?text=${formattedName}`;
  const elements = `["Neutral"]`;
  const rarity = `"Common"`;
  const weaknesses = `["Dark"]`;
  const paldexEntry = `"A mysterious Pal with no known records in the current Paldex database."`;
  
  return `{ id: "${id}", name: "${name}", power: ${power}, image: "${image}", elements: ${elements}, rarity: ${rarity}, weaknesses: ${weaknesses}, paldexEntry: ${paldexEntry} }`;
});

fs.writeFileSync(dataPath, updatedContent);
console.log('Successfully updated data.js');

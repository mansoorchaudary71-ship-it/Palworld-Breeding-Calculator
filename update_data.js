import fs from "fs";

async function run() {
  const r = await fetch('https://raw.githubusercontent.com/mlg404/palworld-paldex-api/main/src/pals.json');
  const pals = await r.json();

  let existingData = fs.readFileSync("./src/data.js", "utf8");
  
  // We want to update elements and paldexEntry in `existingData`
  // We can just parse the original data or regenerate `data.js`.
  
  // Actually, we can just replace the definition of palDatabase entirely 
  // keeping the 'power' numbers from existing if needed, but the new API has `breeding: { rank: ... }` which is what we need for breeding power!
  
  let newPalsStr = "export const palDatabase = [\n";
  
  for (const pal of pals) {
    // some pals might have "b" in their key, e.g. "012b", we uppercase it for the image URL.
    const imageSuffix = pal.key.toUpperCase();
    const image = `https://raw.githubusercontent.com/mlg404/palworld-paldex-api/main/public/images/paldeck/${imageSuffix}.png`;
    
    // elements: format the types array
    const elements = pal.types.map(t => t.name.charAt(0).toUpperCase() + t.name.slice(1));
    
    // some characteristics
    const trait = pal.genus.charAt(0).toUpperCase() + pal.genus.slice(1);
    const power = pal.breeding.rank;
    
    const entry = JSON.stringify(pal.description || "");
    const statsJSON = JSON.stringify(pal.stats || {});
    const suitabilityJSON = JSON.stringify(pal.suitability || []);
    const auraJSON = JSON.stringify(pal.aura || null);
    const dropsJSON = JSON.stringify(pal.drops || []);
    
    newPalsStr += `  { id: "${pal.key}", name: "${pal.name}", power: ${power}, image: "${image}", elements: ${JSON.stringify(elements)}, rarity: "Common", trait: "${trait}", paldexEntry: ${entry}, stats: ${statsJSON}, suitability: ${suitabilityJSON}, aura: ${auraJSON}, drops: ${dropsJSON} },\n`;
  }
  
  newPalsStr += "];\n";
  
  const endOfPalsIndex = existingData.indexOf("];");
  const restOfFile = existingData.slice(endOfPalsIndex + 2);
  
  fs.writeFileSync("./src/data.js", newPalsStr + restOfFile);
  console.log("Updated data.js");
}

run();

const fs = require('fs');
const path = require('path');
const https = require('https');

// Sample array mapping to help fetch elements or format strings
// Update this with the real data sources or list from data.js
const pals = [
  "Lamball", "Cattiva", "Chikipi", "Lifmunk", "Foxparks", 
  "Anubis", "Jormuntide", "Jormuntide Ignis", "Necromus", "Frostallion"
];

const IMAGES_DIR = path.join(__dirname, '../public/images');

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Helper to convert Pal name to filename (e.g. "Jormuntide Ignis" -> "jormuntide-ignis")
function getFilename(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

// Function to simulate downloading an image (Placeholder URL)
function downloadSprite(name) {
  const filename = getFilename(name);
  const dest = path.join(IMAGES_DIR, `${filename}.png`);

  // Usually you would query an API or scrape a wiki, e.g.:
  // const url = `https://some-public-pal-api.com/sprites/${filename}.png`;
  
  // Here we use a placeholder image generation API for demonstration
  const url = `https://api.dicebear.com/7.x/shapes/png?seed=${filename}&size=200`;

  https.get(url, (res) => {
    if (res.statusCode === 200) {
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`✅ Picked up sprite for ${name} -> ${filename}.png`);
      });
    } else {
      console.error(`❌ Failed to download sprite for ${name} (Status code: ${res.statusCode})`);
    }
  }).on('error', (err) => {
    console.error(`❌ Error downloading sprite for ${name}: `, err.message);
  });
}

console.log("Starting Palworld Sprite Download...");
pals.forEach(downloadSprite);

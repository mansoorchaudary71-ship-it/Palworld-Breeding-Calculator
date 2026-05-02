import fs from "fs";

let data = fs.readFileSync("./src/data.js", "utf8");

data = data.replace(/image:\s*"https:\/\/placehold\.co\/100x100\/png\?text=[^"]+",/g, function(match, offset, fullString) {
  // Find id in the same line
  const lineStart = fullString.lastIndexOf('\n', offset);
  const lineEnd = fullString.indexOf('\n', offset);
  const line = fullString.substring(lineStart, lineEnd === -1 ? fullString.length : lineEnd);
  
  const idMatch = line.match(/id:\s*"([^"]+)"/);
  if (idMatch) {
    const id = idMatch[1];
    return `image: "https://raw.githubusercontent.com/mlg404/palworld-paldex-api/main/public/images/paldeck/${id}.png",`;
  }
  return match;
});

fs.writeFileSync("./src/data.js", data);
console.log("Rewrote data.js");

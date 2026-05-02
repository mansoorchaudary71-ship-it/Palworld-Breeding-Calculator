import fs from "fs";

let data = fs.readFileSync("./src/data.js", "utf8");

data = data.replace(/image:\s*"https:\/\/raw\.githubusercontent\.com\/mlg404\/palworld-paldex-api\/main\/public\/images\/paldeck\/([^"]+)\.png",/g, function(match, id) {
  // Convert '012b' to '012B', etc.
  if (/[a-z]/.test(id)) {
    return `image: "https://raw.githubusercontent.com/mlg404/palworld-paldex-api/main/public/images/paldeck/${id.toUpperCase()}.png",`;
  }
  return match;
});

fs.writeFileSync("./src/data.js", data);
console.log("Rewrote uppercase ids");

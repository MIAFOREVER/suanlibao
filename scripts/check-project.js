const fs = require("fs");
const path = require("path");

const required = [
  "apps/desktop/electron/main.js",
  "apps/desktop/src/App.jsx",
  "apps/admin/src/AdminApp.jsx",
  "packages/backend/src/server.js",
  "packages/miner-core/src/minerManager.js"
];

let failed = false;
for (const file of required) {
  if (!fs.existsSync(path.join(process.cwd(), file))) {
    console.error(`Missing ${file}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("Project skeleton looks good.");

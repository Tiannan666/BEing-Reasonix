/**
 * fix-html.js
 *
 * Removes `crossorigin` attributes from <script> and <link> tags in the built HTML.
 * Electron's file:// protocol doesn't support CORS, and crossorigin breaks module loading.
 */
const fs = require("fs");
const path = require("path");

const htmlPath = path.resolve(__dirname, "..", "dist", "renderer", "index.html");

if (!fs.existsSync(htmlPath)) {
  console.error(`[fix-html] ${htmlPath} not found`);
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, "utf-8");

// Remove crossorigin attribute from script and link tags
html = html.replace(/\s+crossorigin(?:\s*=\s*"[^"]*")?/g, "");

// Remove integrity attribute (we don't use SRI in Electron)
html = html.replace(/\s+integrity="[^"]*"/g, "");

fs.writeFileSync(htmlPath, html, "utf-8");
console.log("[fix-html] Removed crossorigin from index.html");

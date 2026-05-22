/**
 * bundle-deps.js
 *
 * Downloads a portable Node.js binary for the target platform(s)
 * into vendor/node/. This Node binary is shipped with the app so
 * users don't need Node pre-installed.
 *
 * Usage:
 *   node scripts/bundle-deps.js           # current platform only
 *   node scripts/bundle-deps.js --all     # all platforms (for CI)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execSync } = require("child_process");

const VENDOR_DIR = path.join(__dirname, "..", "vendor", "node");
const VENDOR_INSTALLER_DIR = path.join(__dirname, "..", "vendor", "node-installer");
const NODE_VERSION = "24.11.0"; // Latest LTS

const PLATFORMS = {
  "win32-x64": {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/win-x64/node.exe`,
    file: "node.exe",
    extract: false,
    msiUrl: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-x64.msi`,
    msiFile: `node-v${NODE_VERSION}-x64.msi`,
  },
  "darwin-x64": {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    file: "node",
    extract: true,
    archivePath: `node-v${NODE_VERSION}-darwin-x64/bin/node`,
  },
  "darwin-arm64": {
    url: `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    file: "node",
    extract: true,
    archivePath: `node-v${NODE_VERSION}-darwin-arm64/bin/node`,
  },
};

function log(msg) {
  console.log(`[bundle-deps] ${msg}`);
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    log(`Downloading ${url} ...`);
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          fs.unlinkSync(dest);
          download(response.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

function extractTarGz(tarballPath, archivePath, destPath) {
  log(`Extracting ${archivePath} from tarball ...`);
  // Use system tar command (available on macOS/Linux; on Windows we don't need it)
  const tmpDir = path.dirname(destPath);
  execSync(`tar -xzf "${tarballPath}" -C "${tmpDir}" "${archivePath}"`, {
    stdio: "pipe",
  });
  // Move extracted file to final location
  const extractedPath = path.join(tmpDir, archivePath);
  if (extractedPath !== destPath) {
    fs.renameSync(extractedPath, destPath);
  }
  // Clean up extracted directory tree
  const topDir = archivePath.split("/")[0];
  const topDirPath = path.join(tmpDir, topDir);
  if (fs.existsSync(topDirPath)) {
    fs.rmSync(topDirPath, { recursive: true, force: true });
  }
  // Remove tarball
  fs.unlinkSync(tarballPath);
}

async function bundlePlatform(platformKey) {
  const config = PLATFORMS[platformKey];
  if (!config) {
    log(`No config for platform ${platformKey}, skipping.`);
    return;
  }

  const destDir = path.join(VENDOR_DIR, platformKey);
  fs.mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, config.file);

  // Download MSI installer first (before potential early return)
  if (config.msiUrl && config.msiFile) {
    fs.mkdirSync(VENDOR_INSTALLER_DIR, { recursive: true });
    const msiPath = path.join(VENDOR_INSTALLER_DIR, config.msiFile);
    if (!fs.existsSync(msiPath)) {
      await download(config.msiUrl, msiPath);
      log(`✅ Node MSI installer ready at ${msiPath}`);
    } else {
      log(`Node MSI installer already exists at ${msiPath}, skipping.`);
    }
  }

  if (fs.existsSync(destPath)) {
    log(`Node binary already exists at ${destPath}, skipping download.`);
    // Make executable
    if (platformKey !== "win32-x64") {
      fs.chmodSync(destPath, 0o755);
    }
    return;
  }

  if (config.extract) {
    const tarballPath = path.join(destDir, "node.tar.gz");
    await download(config.url, tarballPath);
    extractTarGz(tarballPath, config.archivePath, destPath);
  } else {
    await download(config.url, destPath);
  }

  // Make executable on non-Windows
  if (platformKey !== "win32-x64") {
    fs.chmodSync(destPath, 0o755);
  }

  log(`✅ Node ${NODE_VERSION} ready at ${destPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const allPlatforms = args.includes("--all");

  if (allPlatforms) {
    log("Bundling Node.js for all platforms...");
    for (const key of Object.keys(PLATFORMS)) {
      await bundlePlatform(key);
    }
  } else {
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    const key = `${process.platform}-${arch}`;
    log(`Bundling Node.js for current platform: ${key}`);
    await bundlePlatform(key);
  }

  log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

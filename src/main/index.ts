import { app, BrowserWindow } from "electron";
import path from "path";
import { registerIpcHandlers } from "./ipc-handlers";
import { ensureNodeJs, ensureReasonixInstalled } from "./reasonix-process";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 500,
    resizable: false,
    title: "BEing Reasonix",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  }

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  registerIpcHandlers();

  // In packaged builds, ensure dependencies
  if (app.isPackaged) {
    ensureNodeJs();
    ensureReasonixInstalled();
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

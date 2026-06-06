const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { app, BrowserWindow, ipcMain } = require("electron");
const { MinerManager } = require("../../../packages/miner-core/src/minerManager");
const minerConfig = require("./miners.json");

const manager = new MinerManager(minerConfig);
let mainWindow;
let apiServer;

function startBundledApi() {
  if (!app.isPackaged || apiServer) return;
  process.env.DATABASE_PATH = path.join(app.getPath("userData"), "data", "app.json");
  const { app: apiApp } = require("../../../packages/backend/src/server");
  apiServer = apiApp.listen(8787, "127.0.0.1");
  apiServer.on("error", (error) => {
    if (error.code !== "EADDRINUSE") {
      console.error("Bundled API failed:", error);
    }
  });
}

function createWindow() {
  startBundledApi();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    title: "星火 AI",
    backgroundColor: "#f6f8fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.DESKTOP_DEV_URL || "http://127.0.0.1:5173";
  if (app.isPackaged || process.env.NODE_ENV === "production") {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    mainWindow.loadURL(devUrl);
  }
}

app.whenReady().then(createWindow);

app.on("before-quit", () => {
  manager.stopAll();
  apiServer?.close();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("app:device", () => ({
  deviceId: crypto.createHash("sha256").update(`${os.hostname()}-${os.userInfo().username}`).digest("hex"),
  hostname: os.hostname(),
  platform: process.platform
}));

ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:close", () => mainWindow?.close());
ipcMain.handle("miners:list", () => manager.list());
ipcMain.handle("miners:start", (_event, coin) => manager.start(coin));
ipcMain.handle("miners:stop", (_event, coin) => manager.stop(coin));

manager.on("event", (event) => {
  mainWindow?.webContents.send("miners:event", event);
});

manager.on("log", (log) => {
  mainWindow?.webContents.send("miners:log", log);
});

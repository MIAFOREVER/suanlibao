const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { app, BrowserWindow, ipcMain, Menu, Tray } = require("electron");
const { MinerManager } = require("../../../packages/miner-core/src/minerManager");
const minerConfig = require("./miners.json");

const manager = new MinerManager(minerConfig, { baseDir: __dirname });
let mainWindow;
let apiServer;
let tray;
let isQuitting = false;

app.setAppUserModelId("com.xinghuo.ai");

function assetPath(fileName) {
  return path
    .join(__dirname, "assets", fileName)
    .replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
}

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
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 820,
    frame: false,
    icon: assetPath("icon.png"),
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

  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow.hide();
    ensureTray();
  });

  ensureTray();
}

function ensureTray() {
  if (tray) return tray;
  tray = new Tray(assetPath("tray.png"));
  tray.setToolTip("\u661f\u706b AI");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "\u6253\u5f00\u661f\u706b AI", click: showMainWindow },
    { type: "separator" },
    {
      label: "\u9000\u51fa",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on("click", showMainWindow);
  tray.on("double-click", showMainWindow);
  return tray;
}

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

app.whenReady().then(createWindow);

app.on("before-quit", () => {
  isQuitting = true;
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

ipcMain.handle("window:minimize", () => {
  mainWindow?.hide();
  ensureTray();
});
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

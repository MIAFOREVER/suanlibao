const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  device: () => ipcRenderer.invoke("app:device"),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  miners: {
    list: () => ipcRenderer.invoke("miners:list"),
    start: (coin) => ipcRenderer.invoke("miners:start", coin),
    stop: (coin) => ipcRenderer.invoke("miners:stop", coin),
    onEvent: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("miners:event", listener);
      return () => ipcRenderer.removeListener("miners:event", listener);
    },
    onLog: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on("miners:log", listener);
      return () => ipcRenderer.removeListener("miners:log", listener);
    }
  }
});

const { app, BrowserWindow, ipcMain, ipcRenderer } = require("electron");
require("electron-reload")(__dirname);
const { autoUpdater } = require("electron-updater");
var path = require("path");
let loadingWin;
let mainWin;
function createWindow() {
  loadingWin = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    backgroundColor: "#333333",
    hasShadow: false,
    alwaysOnTop: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, "content/images/icon.png")
  });
  loadingWin.loadFile("./pages/Loading.html");
}

app.on("ready", createWindow);

ipcMain.on("loading_finished", event => {
  mainWin = new BrowserWindow({
    width: 850,
    height: 730,
    frame: false,
    hasShadow: false,
    show: false,
    alwaysOnTop: false,
    resizable: false,
    darkTheme: true,
    backgroundColor: "#333333",
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, "content/images/icon.png")
  });
  //mainWin.webContents.openDevTools()
  mainWin.removeMenu();

  mainWin.loadFile("./pages/Main.html");
  mainWin.webContents.on("did-finish-load", function() {
    mainWin.show();
    try {
      loadingWin.close();
    } catch (ex) {}
  });
});

ipcMain.on("app_version", event => {
  event.sender.send("app_version", { version: app.getVersion() });
});

ipcMain.on("update-check", event => {
  autoUpdater.autoDownload = false;
  autoUpdater
    .checkForUpdates()
    .then(data => {})
    .catch(() => {
      loadingWin.webContents.send("update-not-available");
    });
});

ipcMain.on("top-window", event => {
  mainWin.setAlwaysOnTop(true);
  setTimeout(() => {
    mainWin.setAlwaysOnTop(false);
  }, 1000);
});

ipcMain.on("minimalize", event => {
  mainWin.minimize();
});

ipcMain.on("close", event => {
  mainWin.close();
});

autoUpdater.on("update-not-available", data => {
  loadingWin.webContents.send("update-not-available");
});

autoUpdater.on("update-available", data => {
  loadingWin.webContents.send("update-available");
  autoUpdater.downloadUpdate().then(e => {
    autoUpdater.quitAndInstall();
  });
});

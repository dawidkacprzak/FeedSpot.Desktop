const { app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
var path = require('path')
const log  = require("electron-log");
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
    icon: path.join(__dirname,"content/images/icon.png")
  });
  loadingWin.webContents.on("devtools-opened", () => {
    //win.webContents.closeDevTools();
  });
  loadingWin.loadFile("./pages/Loading.html");

}

app.on("ready", createWindow);

ipcMain.on("loading_finished",event => {
  mainWin = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 300,
    minHeight: 35,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    darkTheme: true,
    backgroundColor: "#333333",
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname,"content/images/icon.png")
  });
  mainWin.loadFile("./pages/Main.html");
  mainWin.removeMenu();
  mainWin.moveTop();
  mainWin.center();
  mainWin.setAlwaysOnTop(false)
  loadingWin.close();
});

ipcMain.on("app_version", event => {
  event.sender.send("app_version", { version: app.getVersion() });
});

ipcMain.on("update-check", event => {
  autoUpdater.autoDownload = false;
  autoUpdater.checkForUpdates().then((data)=>{
  }).catch(()=>{
    loadingWin.webContents.send("update-not-available");
  })
})

autoUpdater.on("update-not-available",data => {
  loadingWin.webContents.send("update-not-available")
})

autoUpdater.on("update-available",data => {
  loadingWin.webContents.send("update-available")
  autoUpdater.downloadUpdate().then((e)=>{
    autoUpdater.quitAndInstall();
  })
})

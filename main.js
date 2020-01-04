const { app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const log  = require("electron-log");
let loadingWin;
function createWindow() {
  loadingWin = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  });
  loadingWin.webContents.on("devtools-opened", () => {
    //win.webContents.closeDevTools();
  });
  loadingWin.loadFile("./pages/Loading.html");
}

app.on("ready", createWindow);

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

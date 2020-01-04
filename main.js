const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const { autoUpdater } = require("electron-updater");
var path = require('path')
const log  = require("electron-log");

let loadingWin;
let mainWin;


function createWindow() {
  mainWin = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    darkTheme: true,
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
  globalShortcut.register('f5', function() {
		console.log('f5 is pressed')
		mainWin.reload()
	})
  //loadingWin.close();
}

app.on("ready", createWindow);

ipcMain.on("loading_finished",event => {
  mainWin = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    darkTheme: true,
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

const { app, BrowserWindow } = require("electron");

let loadingWin;
function createWindow() {
  loadingWin = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
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

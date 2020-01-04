const { ipcRenderer, ipcMain } = require("electron");

let minimalizeButton;
let closeButton;
let fullscreenButton;

window.onload = () => {
    minimalizeButton = document.getElementById("app-func-minimalize");
    closeButton = document.getElementById("app-func-close");
    fullscreenButton = document.getElementById("app-func-fullscreen");
    ipcRenderer.send("getFullscreenIcon");

    minimalizeButton.onclick = () => {
        ipcRenderer.send("minimalize");
    }

    closeButton.onclick = () => {
        ipcRenderer.send("close");
    }

    fullscreenButton.onclick = () => {
        ipcRenderer.send("changeFullscreenState");
        ipcRenderer.send("getFullscreenIcon");
    }

    ipcRenderer.on("getFullscreenIcon", (event,args) => {
        fullscreenButton.src = "../content/images/"+args.icon
    })
}
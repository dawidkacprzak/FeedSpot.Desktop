const { ipcRenderer, ipcMain } = require("electron");
const LCUConnector = require("lcu-connector");
let minimalizeButton;
let closeButton;
let fullscreenButton;
let pleaseOpenLolLabel;
const connector = new LCUConnector();

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

window.onload = () => {
  minimalizeButton = document.getElementById("app-func-minimalize");
  closeButton = document.getElementById("app-func-close");
  fullscreenButton = document.getElementById("app-func-fullscreen");
  pleaseOpenLolLabel = document.getElementById("waiting-for-league");
  ipcRenderer.send("getFullscreenIcon");

  minimalizeButton.onclick = () => {
    ipcRenderer.send("minimalize");
  };

  closeButton.onclick = () => {
    ipcRenderer.send("close");
  };

  fullscreenButton.onclick = () => {
    ipcRenderer.send("changeFullscreenState");
    ipcRenderer.send("getFullscreenIcon");
  };

  ipcRenderer.on("getFullscreenIcon", (event, args) => {
    fullscreenButton.src = "../content/images/" + args.icon;
  });

  sleep(1000).then(() => {
    connector.on("connect", data => {
      pleaseOpenLolLabel.style.display = "none";
    });
    connector.start();
  });
};

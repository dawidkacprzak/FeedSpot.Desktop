const { ipcRenderer, ipcMain } = require("electron");
const LCUConnector = require("lcu-connector");
const https = require("https");
const swaggerUI = require("swagger-ui");
const axios = require("axios").default;
const rp = require("request-promise");

let minimalizeButton;
let closeButton;
let fullscreenButton;
let pleaseOpenLolLabel;
let LCUData;
let checkingLobbyInterval;

let connectedToChampionSelect = false;
let loggedServer;
let loggedServerInt;
let inLobby = false;

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
      pleaseOpenLolLabel.innerText = "Ye ye u r logged.";
      LCUData = data;
      const { username, password, address, port } = LCUData;
      LCURequest("GET", "/lol-acs/v1/delta").then(delta => {
        loggedServer = delta.originalPlatformId;
        loggedServerInt = deltaServerToInt(loggedServer);
        runCheckingLobbyLoop();
      });
    });

    connector.on("disconnect", data => {
      clearInterval(checkingLobbyInterval);
      loggedServer = null;
      loggedServerInt = null;
      inLobby = false;
      connectedToChampionSelect = false;
    });
    connector.start();
  });
};

const runCheckingLobbyLoop = () => {
  checkingLobbyInterval = setInterval(function() {
    LCURequest("GET", "/lol-champ-select/v1/session")
      .then(e => {
        if (!inLobby) {
          pleaseOpenLolLabel.innerText = "Fetching data from champion select.";
          console.log("connected to lobby");
          console.log("im on server : " + loggedServer + " " + loggedServerInt);
          inLobby = true;
          let myTeam = e.myTeam;
          let chatDetails = e.chatDetails;
          connectedToChampionSelect = true;
          let matchedSummoners = [];
          myTeam.forEach(player => {
            if (player.playerType == "PLAYER") {
              matchedSummoners.push(player.summonerId);
            }
          });
          LCURequest(
            "GET",
            "/lol-summoner/v2/summoners?ids=" + JSON.stringify(matchedSummoners)
          ).then(players => {
            let models = [];
            if (players.length > 0) {
              let index = 0;
              players.forEach(singlePlayer => {
                console.log(singlePlayer);
                APIRequest(
                  "GetPlayerModel?nickname=" +
                    encodeURIComponent(singlePlayer.displayName) +
                    "&server=" +
                    encodeURIComponent(loggedServerInt)
                )
                  .then(modelApi => {
                    models.push(modelApi);
                    console.log("pusz");
                  })
                  .catch(e => {
                    alert("Error occured - send it to application owner: "+e);
                  })
                  .finally(() => {
                    index++;
                    if (index == players.length) {
                      championSelectPresentation(models)
                    }
                  });
              });
            }
          });
        }
      })
      .catch(e => {
        inLobby = false;
      });
  }, 2000);
};

const championSelectPresentation = (modelArr) => {
  console.log(modelArr[0])
}

const LCURequest = (method, endpoint) => {
  return new Promise((resolve, revoke) => {
    var options = {
      strictSSL: false,
      method: method,
      uri:
        `https://${LCUData.username}:${LCUData.password}@${LCUData.address}:${LCUData.port}` +
        endpoint,
      json: true
    };
    rp(options)
      .then(d => {
        resolve(d);
      })
      .then(d => resolve(d))
      .catch(e => revoke(e));
  });
};

const APIRequest = endpoint => {
  return new Promise((resolve, revoke) => {
    var options = {
      strictSSL: false,
      method: "GET",
      uri: `http://localhost:22567/Main/` + endpoint,
      json: true
    };
    rp(options)
      .then(d => {
        resolve(d);
      })
      .then(d => resolve(d))
      .catch(e => revoke(e));
  });
};

const deltaServerToInt = server => {
  switch (server.toUpperCase()) {
    case "EUN1":
      return 0;
    case "EUW1":
      return 1;
    case "TR1":
      return 3;
    case "RU":
      return 2;
    case "NA1":
      return 4;
  }
};

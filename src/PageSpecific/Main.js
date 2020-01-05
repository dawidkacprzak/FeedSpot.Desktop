const { ipcRenderer, ipcMain } = require("electron");
const LCUConnector = require("lcu-connector");
const https = require("https");
const swaggerUI = require("swagger-ui");
const axios = require("axios").default;
const rp = require("request-promise");
const opn = require("opn");

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
                    alert("Error occured - send it to application owner: " + e);
                  })
                  .finally(() => {
                    index++;
                    if (index == players.length) {
                      championSelectPresentation(models);
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

const championSelectPresentation = modelArr => {
  let container = document.getElementById("fetched-players-container");
  container.innerHTML = "";
  document.getElementById("waiting-for-league").classList.add("hidden");

  modelArr.forEach(player => {
    console.log(player);
    let playerJSONModel = JSON.parse(player);
    let playerBasic = playerJSONModel.PlayerBasic;
    let riotModel = playerBasic.RiotModel;

    let nickname = riotModel.name;
    let reputation = playerJSONModel.Reputation;
    let CommentCount = playerJSONModel.CommentCount;
    let OPGGURL = playerJSONModel.OPGGUrl;
    let LOGUrl = playerJSONModel.LOGUrl;

    let positiveComments = 0;
    let count = 0;

    playerJSONModel.PlayerComments.forEach(element => {
      if (element.CommentType == 1) {
        positiveComments++;
      } else {
        negativeComments++;
      }
      count++;
    });

    let percentPositiveValue;
    if (count == 0) {
      percentPositiveValue = 0;
    } else {
      percentPositiveValue = Math.round(((positiveComments / count) * 100) / 1);
    }

    let cardContainer = document.createElement("div");
    cardContainer.classList.add("fetched-card-container");

    let cardTop = document.createElement("div");
    cardTop.classList.add("fetched-top");
    cardTop.innerText = nickname;

    let opinionCount = document.createElement("div");
    opinionCount.classList.add("fetched-full-block");
    opinionCount.classList.add("dark-bottom-border");
    opinionCount.innerText = CommentCount + " Opinions";

    let opinionsContainer = document.createElement("div");
    opinionsContainer.classList.add("same-size-container");

    let positiveOpinionsCount = document.createElement("div");
    positiveOpinionsCount.classList.add("opinion-count");
    positiveOpinionsCount.classList.add("dark-bottom-border");
    positiveOpinionsCount.classList.add("dark-right-border");
    positiveOpinionsCount.innerHTML = "Positive" + "<br />" + positiveComments;

    let negativeOpinionsCount = document.createElement("div");
    negativeOpinionsCount.classList.add("opinion-count");
    negativeOpinionsCount.innerHTML =
      "Negative" + "<br />" + (positiveComments - count);

    let positivePercent = document.createElement("div");
    positivePercent.classList.add("percent-block");
    positivePercent.classList.add("dark-bottom-border");
    positivePercent.innerHTML =
      "Positive percent <br/>" + percentPositiveValue + "%";

    opinionsContainer.appendChild(positiveOpinionsCount);
    opinionsContainer.appendChild(negativeOpinionsCount);

    let openOnWeb = document.createElement("div");
    openOnWeb.classList.add("fetched-social-block");
    openOnWeb.innerText = "Open profile";
    openOnWeb.classList.add("hover-button");
    openOnWeb.onclick = () =>
      opn(
        "https://feedspot.gg/player?nicknames=" +
          nickname +
          "&server=" +
          loggedServerInt
      );

    let OpggLog = document.createElement("div");
    OpggLog.classList.add("same-size-container");

    let opgg = document.createElement("div");
    opgg.classList.add("social-button");
    opgg.classList.add("social-right-margin");
    opgg.classList.add("hover-button");
    opgg.innerText = "OP.GG";
    opgg.onclick = () => opn(OPGGURL);

    let log = document.createElement("div");
    log.classList.add("social-button");
    log.classList.add("social-left-margin");
    log.classList.add("hover-button");
    log.innerText = "LOG";
    log.onclick = () => opn(LOGUrl);

    let reportPlayer = document.createElement("div");
    reportPlayer.classList.add("report-player-block");
    reportPlayer.classList.add("hover-button");
    reportPlayer.innerText = "Report player";

    OpggLog.appendChild(opgg);
    OpggLog.appendChild(log);

    cardContainer.appendChild(cardTop);
    cardContainer.appendChild(opinionCount);
    cardContainer.appendChild(opinionsContainer);
    cardContainer.appendChild(positivePercent);
    cardContainer.appendChild(openOnWeb);
    cardContainer.appendChild(OpggLog);
    cardContainer.appendChild(reportPlayer);

    container.appendChild(cardContainer);
  });
  container.classList.remove("hidden");
};

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
      uri: `http://feedspot.gg:85/Main/` + endpoint,
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

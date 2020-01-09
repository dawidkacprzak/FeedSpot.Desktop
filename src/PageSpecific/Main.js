const { ipcRenderer, ipcMain, clipboard } = require("electron");
const LCUConnector = require("lcu-connector");
const https = require("https");
const swaggerUI = require("swagger-ui");
const axios = require("axios").default;
const rp = require("request-promise");
const opn = require("opn");

let minimalizeButton;
let closeButton;
let leagueClientStatusLabel;
let LCUData;
let checkingLobbyInterval;
let contentLabel;
let contentLabelContent;
let connectedToChampionSelect = false;
let loggedServer;
let loggedServerInt;
let inLobby = false;

//report form
let reportedPlayerNick;
let reportedServer;
let reportedDescripton;
let reportedYourName;
let reportedPositiveButton;
let reportedNegativeButton;
let reportedSubmitButton;
///

const connector = new LCUConnector();

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

window.onload = () => {
  contentLabel = document.getElementById("content-label");
  contentLabelContent = document.getElementById("content-label-content");

  minimalizeButton = document.getElementById("app-func-minimalize");
  closeButton = document.getElementById("app-func-close");
  leagueClientStatusLabel = document.getElementById("league-status-label");

  reportedPlayerNick = document.getElementById("report-data-reported");
  reportedServer = document.getElementById("report-data-server");
  reportedSubmitButton = document.getElementById("submit-opinion-button");
  reportedPositiveButton = document.getElementById("report-data-positive");
  reportedNegativeButton = document.getElementById("report-data-negative");
  reportedDescripton = document.getElementById("report-data-description");
  reportedYourName = document.getElementById("report-data-nickname"); 
  reportedSubmitButton.onclick = () => submitReport();

  let buttons = document.getElementsByClassName("menu-button");
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].onclick = e => {
      ChangeMenuTab(buttons[i].id);
    };
  }

  ipcRenderer.send("getFullscreenIcon");

  minimalizeButton.onclick = () => {
    ipcRenderer.send("minimalize");
  };

  closeButton.onclick = () => {
    ipcRenderer.send("close");
  };

  sleep(1000).then(() => {
    connector.on("connect", data => {
      console.log("connected");
      leagueClientStatusLabel.innerText = "Connected to league client";
      LCUData = data;
      const { username, password, address, port } = LCUData;
      let fail = true;
      console.log("sleep ten");
      makeDeltaRequestAndStartLobbyLoop();
    });

    connector.on("disconnect", data => {
      try {
        leagueClientStatusLabel.innerText = "Disconnected from league client";
        clearInterval(checkingLobbyInterval);
        inLobby = false;
        connectedToChampionSelect = false;

        if (contentLabel.classList.contains("hidden")) {
          contentLabel.classList.remove("hidden");
        }
      } catch (ex) {
        console.log(ex);
      }
    });
    connector.start();
  });
};

const makeDeltaRequestAndStartLobbyLoop = () => {
  LCURequest("GET", "/lol-acs/v1/delta")
    .then(delta => {
      try {
        loggedServer = delta.originalPlatformId;
        loggedServerInt = deltaServerToInt(loggedServer);
        runCheckingLobbyLoop();
      } catch (e) {
        makeDeltaRequestAndStartLobbyLoop();
      }
    })
    .catch(() => {
      makeDeltaRequestAndStartLobbyLoop();
    });
};

const runCheckingLobbyLoop = () => {
  console.log("LOOP STARTED");
  clearInterval(checkingLobbyInterval);
  checkingLobbyInterval = setInterval(function() {
    LCURequest("GET", "/lol-champ-select/v1/session")
      .then(e => {
        if (!inLobby) {
          leagueClientStatusLabel.innerText =
            "Fetching data from champion select";
          inLobby = true;
          let myTeam = e.myTeam;
          let chatDetails = e.chatDetails;
          connectedToChampionSelect = true;
          let matchedSummoners = [];
          console.log(JSON.stringify(myTeam));

          myTeam.forEach(player => {
            if (player.playerType == "PLAYER" || player.playerType == "") {
              matchedSummoners.push(player.summonerId);
              console.log("push " + player);
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
  let nicknames = [];
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
    reportPlayer.onclick = () => {};

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

    nicknames.push(nickname);
  });
  if (container.classList.contains("hidden")) {
    container.classList.remove("hidden");
  }
  let contentLabelShare = document.createElement("p");
  let contentLabelButton = document.createElement("div");

  contentLabelShare.id = "share-text";
  contentLabelShare.innerText =
    "Maximalize your win chance, let your teammates know about this match";

  contentLabelButton.id = "share-button";
  contentLabelButton.innerText = "Copy link";
  contentLabelButton.onclick = () => {
    if (nicknames.length > 1) {
      clipboard.writeText(
        "https://feedspot.gg/players?nicknames=" +
          nicknames.join() +
          "&server=" +
          loggedServerInt
      );
    } else {
      clipboard.writeText(
        "https://feedspot.gg/player?nicknames=" +
          nicknames.join() +
          "&server=" +
          loggedServerInt
      );
    }
  };
  contentLabelContent.innerHTML = "";
  contentLabelContent.appendChild(contentLabelShare);
  contentLabelContent.appendChild(contentLabelButton);

  if (contentLabel.classList.contains("hidden")) {
    contentLabel.classList.remove("hidden");
  }
  ipcRenderer.send("top-window");
  document.getElementById("menu-button-snipe").click();
  leagueClientStatusLabel.innerText = "Connected to league client";
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

///reportedForm

const submitReport = () => {
  const getIP = require("external-ip")();
  let CommentType = getReportOpinionType() ? 1 : 0;
  let CreatedDate = Date.now();
  let Description = reportedDescripton.value;
  let ReportOwner = reportedYourName.value;
  let Server = reportedServer.value;
  let ReportedPlayer = reportedPlayerNick.value;
  let IP;
  getIP((err, ip) => {
    if (err) {
      alert("Error during fetching your configuration...");
    } else {
      IP = ip;
      const jsonModel = {
        CommentType,CreatedDate,Description,ReportOwner,Server,ReportedPlayer,IP
      }
      console.log(jsonModel);
    }
  });
};

const setReportOpinionType = type => {
  if (reportedPositiveButton.classList.contains("selected-report-type")) {
    reportedPositiveButton.classList.remove("selected-report-type");
  }
  if (reportedNegativeButton.classList.contains("selected-report-type")) {
    reportedNegativeButton.classList.remove("selected-report-type");
  }
  switch (type) {
    case true:
      reportedPositiveButton.classList.add("selected-report-type");
      break;
    case false:
      reportedNegativeButton.classList.add("selected-report-type");
      break;
  }
};

const getReportOpinionType = () => {
  if (reportedPositiveButton.classList.contains("selected-report-type")) {
    return true;
  }

  if (reportedNegativeButton.classList.contains("selected-report-type")) {
    return false;
  }

  return undefined;
};

///

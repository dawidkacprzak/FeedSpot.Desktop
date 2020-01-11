const { ipcRenderer, ipcMain, clipboard } = require("electron");
const Dialog = require("electron-dialog");
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
let connectedToClient = false;
//report form
let reportedPlayerNick;
let reportedServer;
let reportedDescripton;
let reportedYourName;
let reportedPositiveButton;
let reportedNegativeButton;
let reportedSubmitButton;
///
//account page
let accountPageFetchData;
let accountPageNicknameInput;
let accountPageServerSelect;
let accountPageLoadingOverlay;

let accountPageReputation;
let accountPageReportCount;
let accountPagePositivePercent;
let accountPageFeedSpotUrl;
let accountPageOPGGUrl;
let accountPageLOGUrl;
let accountPageReportContainer;
let accountPageIcon;
let accountPageNick;
let accountPageServer;
//

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
  accountPageFetchData = document.getElementById("fetch-account-button");
  accountPageLoadingOverlay = document.getElementById("current-player-loading");
  accountPageIcon = document.getElementById("current-player-icon")
  accountPageNicknameInput = document.getElementById(
    "current-player-data-reported"
  );
  accountPageServerSelect = document.getElementById(
    "current-player-data-server"
  );

  accountPageNick = document.getElementById("current-player-nickname");
  accountPageServer = document.getElementById("current-player-server");

  accountPageReputation = document.getElementById("current-player-reputation");
  accountPageReportCount = document.getElementById(
    "current-player-reportcount"
  );
  accountPagePositivePercent = document.getElementById(
    "current-player-positivepercent"
  );
  accountPageFeedSpotUrl = document.getElementById(
    "current-player-feedspoturl"
  );
  accountPageOPGGUrl = document.getElementById("current-player-opggurl");
  accountPageLOGUrl = document.getElementById("current-player-logurl");
  accountPageReportContainer = document.getElementById(
    "current-player-reports"
  );

  reportedSubmitButton.onclick = () => submitReport();
  accountPageFetchData.onclick = () => downloadModelForAccountPageFromInputs();
  accountPageNicknameInput.onkeypress = (key) => {
    if(key.keyCode === 13){
      downloadModelForAccountPageFromInputs();
    }
  }
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

  sleep(400).then(() => {
    connector.on("connect", data => {
      connectedToClient = true;
      leagueClientStatusLabel.innerText = "Connected to league client";
      LCUData = data;
      const { username, password, address, port } = LCUData;
      let fail = true;
      console.log("sleep ten");
      makeDeltaRequestAndStartLobbyLoop();
    });

    connector.on("disconnect", data => {
      try {
        connectedToClient = false;
        leagueClientStatusLabel.innerText = "Disconnected from league client";
        clearInterval(checkingLobbyInterval);
        inLobby = false;
        connectedToChampionSelect = false;

        showOrHideBottomLabel();
      } catch (ex) {
        console.log(ex);
      }
    });
    connector.start();
  });

  sleep(1500).then(()=>{
    if(connectedToClient != true){
      downloadModelForAccountPage("Rekurencja",'0')
    }
  })
};

const makeDeltaRequestAndStartLobbyLoop = () => {
  LCURequest("GET", "/lol-acs/v1/delta")
    .then(delta => {
      try {
        console.log(delta);
        loggedServer = delta.originalPlatformId;
        loggedServerInt = deltaServerToInt(loggedServer);
        if (loggedServerInt != undefined && loggedServerInt != null) {
          setReportServer(loggedServerInt);
        }
        LCURequest("GET", "/lol-summoner/v1/current-summoner")
          .then(currentSummoner => {
            setYourReportNickname(currentSummoner.displayName);
            downloadModelForAccountPage(currentSummoner.displayName,loggedServerInt.toString())

          })
          .catch(er => {})
          .finally(() => {
            runCheckingLobbyLoop();
          });
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
          if (loggedServerInt != undefined && loggedServerInt != null) {
            setReportServer(loggedServerInt);
          }
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
    reportPlayer.onclick = () => {
      setReportNickname(nickname);
      ChangeMenuTab("menu-button-report");
    };

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

  showOrHideBottomLabel();

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
  reportedSubmitButton.disabled = true;
  reportedSubmitButton.innerText = "Please wait...";
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
        CommentType,
        CreatedDate,
        Description,
        ReportOwner,
        Server,
        ReportedPlayer,
        IP
      };
      MakeRequest(
        "AddReportToPlayer?simpleCommentJSONModel=" +
          encodeURIComponent(JSON.stringify(jsonModel))
      )
        .then(e => {
          Dialog.alert("Opinion has been added");
        })
        .catch(e => {
          Dialog.alert(e);
        })
        .finally(() => {
          reportedSubmitButton.disabled = false;
          reportedSubmitButton.innerText = "Submit opinion";
        });

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

const setReportServer = serverId => {
  reportedServer.value = serverId;
};

const setReportNickname = nickname => {
  reportedPlayerNick.value = nickname;
};

const setYourReportNickname = nickname => {
  reportedYourName.value = nickname;
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

const MakeRequest = endpoint => {
  return new Promise((resolve, reject) => {
    let url = "http://feedspot.gg:85/Main/" + endpoint;
    console.log(url);
    axios
      .get(url)
      .then(e => {
        resolve(e);
      })
      .catch(ex => {
        reject(ex.response.data);
      });
  });
};

const showOrHideBottomLabel = () => {
  if (inLobby) {
    if (contentLabel.classList.contains("hidden")) {
      contentLabel.classList.remove("hidden");
    }
  } else {
    if (!contentLabel.classList.contains("hidden")) {
      contentLabel.classList.add("hidden");
    }
  }
};

const hideBottomLabel = () => {
  if (!contentLabel.classList.contains("hidden")) {
    contentLabel.classList.add("hidden");
  }
};

let enabledAccountPageButton = true;
const downloadModelForAccountPageFromInputs = () => {
  downloadModelForAccountPage(
    accountPageNicknameInput.value,
    accountPageServerSelect.value
  );
};

const downloadModelForAccountPage = (nickname, server) => {
  console.log("down: "+nickname + " " + server)
  if (enabledAccountPageButton) {
    enabledAccountPageButton = false;
    if (nickname == "") {
      enabledAccountPageButton = true;
    } else {
      if (accountPageLoadingOverlay.classList.contains("hidden")) {
        accountPageLoadingOverlay.classList.remove("hidden");
      }
      MakeRequest(
        "GetPlayerModel?nickname=" +
          encodeURIComponent(nickname) +
          "&server=" +
          server
      )
        .then(e => {
          let res = e.data;
          let reputation = res.Reputation;
          let commentCount = res.CommentCount;
          let opggurl = res.OPGGUrl;
          let logurl = res.LOGUrl;
          let count = 0;
          let negativeCount = 0;
          let positiveCount = 0;
          let feedspoturl =
            "https://feedspot.gg/player?nicknames=" +
            nickname +
            "&server=" +
            server;
          let profileIconId = res.PlayerBasic.RiotModel.profileIconId;
          let profileiconurl = "http://ddragon.leagueoflegends.com/cdn/10.1.1/img/profileicon/"+profileIconId+".png"
          accountPageIcon.src = profileiconurl;
          accountPageReportContainer.innerHTML = "";
          accountPageNick.innerText = nickname;
          accountPageServer.innerText = "(" +getHumanServerNameFromInt(server) + ")";
          res.PlayerComments.forEach(element => {
            count++;
            if (element.CommentType == "0") {
              negativeCount++;
            } else {
              positiveCount++;
            }

            let reportItemContainer = document.createElement("div");
            reportItemContainer.classList.add("report-item-container");

            let reportItemHeader = document.createElement("div");
            reportItemHeader.classList.add("report-item-header");

            let dateReportOwnerSpan = document.createElement("span");
            var date = new Date(element.CreatedDate);
            dateReportOwnerSpan.innerText =
              element.ReportOwner + " - " + date.toLocaleDateString();

            let reportType = document.createElement("span");
            reportType.innerText =
              element.CommentType == 0 ? "Negative" : "Positive";

            let reportDescription = document.createElement("div");
            reportDescription.classList.add("report-item-description");
            reportDescription.innerText = element.Description;

            reportItemHeader.appendChild(dateReportOwnerSpan);
            reportItemHeader.appendChild(reportType);

            reportItemContainer.appendChild(reportItemHeader);
            reportItemContainer.appendChild(reportDescription);
            accountPageReportContainer.appendChild(reportItemContainer);
          });

          if (res.PlayerComments.length == 0) {
            accountPageReportContainer.innerText = "There is no comments";
          }
          percentPositiveValue = Math.round(
            ((positiveCount / count) * 100) / 1
          );

          if (count == 0) percentPositiveValue = 0;
          accountPageReputation.innerText = "Reputation factor: " + reputation;
          accountPageReportCount.innerText = "Report count: " + commentCount;
          accountPagePositivePercent.innerText =
            "Positive percent: " + percentPositiveValue + "%";
          accountPageFeedSpotUrl.onclick = () => opn(feedspoturl);
          accountPageOPGGUrl.onclick = () => opn(opggurl);
          accountPageLOGUrl.onclick = () => opn(logurl);
        })
        .catch(e => {
          console.log(e);
          Dialog.alert("Cannot find specified player");
        })
        .finally(() => {
          reportedSubmitButton.disabled = false;
          reportedSubmitButton.innerText = "Submit opinion";
          enabledAccountPageButton = true;
          if (!accountPageLoadingOverlay.classList.contains("hidden")) {
            accountPageLoadingOverlay.classList.add("hidden");
          }
        });
    }
  }
};

const getHumanServerNameFromInt = index => {
  switch (index) {
    case "0":
      return "EUNE";
    case "1":
      return "EUW";
    case "2":
      return "RU";
    case "3":
      return "TR";
    case "4":
      return "NA";
  }
};

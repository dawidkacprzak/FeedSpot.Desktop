const axios = require("axios").default;
const https = require("https");
const { ipcRenderer } = require("electron");

let statusLabel;

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const MakeRequest = endpoint => {
  return new Promise((resolve, reject) => {
    let url = "http://localhost:5004/Main/" + endpoint;
    axios
      .get(url)
      .then(() => {
        resolve(true);
      })
      .catch(ex => {
        reject(false);
      });
  });
};

const CheckStatus = (endpoint, beforeText, failText) => {
  return new Promise((resolve, reject) => {
    statusLabel.innerText = beforeText;
    sleep(500).then(() => {
      MakeRequest(endpoint)
        .then(() => {
          resolve(true);
        })
        .catch(e => {
          statusLabel.innerText = failText;
          reject(false);
        });
    });
  });
};

window.onload = () => {
  statusLabel = document.getElementById("loading-state");
  CheckStatus(
    "IsApiActive",
    "Are we active?",
    "We are not active! Try again later!"
  ).then(() => {
    CheckStatus(
      "IsFirebaseAuthenticationActive",
      "Taming data!",
      "Oh, our data service is not active. Try again later!"
    ).then(() => {
      CheckStatus(
        "IsRiotActive",
        "Summoning Super Minions!",
        "Bleh! Error occured during communicating with riot service. Try again later!"
      ).then(() => {
        ipcRenderer.send("update-check");
      });
    });
  });
};


ipcRenderer.on("update-available", () => {
    statusLabel.innerText = "There is a little update!";
});

ipcRenderer.on("update-not-available", () => {
    alert("nie ma aktualizacji - aplikacja powinna sie tera wlaczyc ale nie ma tego ficzerka")
});
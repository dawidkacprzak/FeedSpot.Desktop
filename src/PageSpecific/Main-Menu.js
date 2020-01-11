const ChangeMenuTab = senderId => {
  let correct = true;
  let selectedElement = document.getElementById(senderId);

  switch (senderId) {
    case "menu-button-snipe":
      clearContextMenu();
      document
        .getElementById("fetched-players-container")
        .classList.remove("hidden");
      break;
    case "menu-button-stats":
      clearContextMenu();
      break;
    case "menu-button-account":
      clearContextMenu();
      document
      .getElementById("current-players-container")
      .classList.remove("hidden");
      break;
    case "menu-button-website":
      opn("https://feedspot.gg")
      break;
    case "menu-button-bugs":
      clearContextMenu();
      break;
    case "menu-button-report":
      clearContextMenu();
      document
      .getElementById("report-player-container")
      .classList.remove("hidden");
        break;
    default:
      correct = false;
      break;
  }
  if (correct) {
    if (!selectedElement.classList.contains("selected-menu")) {
      document.getElementById(senderId).classList.add("selected-menu");
    }
  }
};

const clearContextMenu = () => {
  let boxes = document.getElementsByClassName("content-box");
  for (let i = 0; i < boxes.length; i++) {
    if (!boxes[i].classList.contains("hidden")) {
      boxes[i].classList.add("hidden");
    }
  }

  let buttons = document.getElementsByClassName("menu-button");
  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].classList.contains("selected-menu")) {
      buttons[i].classList.remove("selected-menu");
    }
  }
};

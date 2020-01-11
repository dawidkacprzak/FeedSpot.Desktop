
const ChangeMenuTab = senderId => {
  let correct = true;
  let selectedElement = document.getElementById(senderId);

  switch (senderId) {
    case "menu-button-snipe":
      clearContextMenu();
      showOrHideBottomLabel();
      document
        .getElementById("fetched-players-container")
        .classList.remove("hidden");
      break;
    case "menu-button-stats":
      clearContextMenu();
      hideBottomLabel();

      break;
    case "menu-button-account":
      clearContextMenu();
      hideBottomLabel();

      document
      .getElementById("current-players-container")
      .classList.remove("hidden");
      break;
    case "menu-button-website":
      opn("https://feedspot.gg")
      correct = false;
      break;
    case "menu-button-bugs":
      Dialog.alert("If you found any bug or want to share your opinion with us feel free to mail us on dawidkacprzak@icloud.com ")
      correct = false;
      break;
    case "menu-button-report":
      clearContextMenu();
      hideBottomLabel();
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

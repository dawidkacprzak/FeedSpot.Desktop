const ChangeMenuTab = senderId => {
  let correct = true;
  let selectedElement = document.getElementById(senderId);
  clearContextMenu();
  switch (senderId) {
    case "menu-button-snipe":
      document
        .getElementById("fetched-players-container")
        .classList.remove("hidden");
      break;
    case "menu-button-stats":
      break;
    case "menu-button-account":
      break;
    case "menu-button-website":
      break;
    case "menu-button-bugs":
      break;
      case "menu-button-report":
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

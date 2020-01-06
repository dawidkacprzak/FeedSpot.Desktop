const ChangeMenuTab = senderId => {
  clearContentBoxes();
  switch (senderId) {
    case "menu-button-snipe":
        document.getElementById("fetched-players-container").classList.remove("hidden");
      break;
    case "menu-button-stats":
      break;
    case "menu-button-star":
      break;
    case "menu-button-global":
      break;
    case "menu-button-bug":
      break;
  }
};

const clearContentBoxes = () => {
    let buttons = document.getElementsByClassName("content-box");
    for (let i = 0; i < buttons.length; i++) {
      if(!buttons[i].classList.contains("hidden")){
        buttons[i].classList.add("hidden");
      }
    } 
}

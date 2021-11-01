// <-- Beware all who enter - this code is an absolute mess - 
// it needs major restructuring, cleaning and formatting --->
const BG_COLOUR = '#231f20';
const SNAKE_COLOUR = '#c2c2c2';
// const FOOD_COLOUR = '#e66916';
const FOOD_COLOUR = 'red';
var gameID = "";
var joinID;
var targetPod = "";
var playerNumber;
var PlayerCount;
var lastKey;
var isNewGame = false;
var discoMode = false;
var highscore =0;
var dmCount = 0;
var SNOKE_SERVER = "localhost";
var inputStack = [];
var snakeTrail = true;
var snakeTransparency = 1;
var rainbowMode = false;
var focused = true;

var rainbowModeCount = 0;
const gameScreen = document.getElementById('gameScreen');
const initialScreen = document.getElementById('initialScreen');
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const initialScreenContainer = document.getElementById('initialScreen-Container');
const canvasListener = document.getElementById('canvas');
const copyIDButton = document.getElementById('gameCodeContainer');
const playerScoreText = document.getElementById("player-scoreText");
const playerHighScoreText = document.getElementById("player-highscoreText");


dpi = window.devicePixelRatio;

// serverButton.addEventListener('click', processServer);
var socket;


// if URL query contains gameID, join a game
urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('gameID')){
  joinID = urlParams.get('gameID');
  joinGamePopup();
}

async function createSocket() {
   gameID = targetPod ? `/?gameID=${targetPod}`: "";
   console.log(`Connecting to: ${SNOKE_SERVER}${gameID}`);
   try {
    socket =  io(`https://${SNOKE_SERVER}${gameID}`, {'path': '/socket'});
   }
   catch(error){
     errorPopup("Connection Failed", "Failed to connect to server");
     return;
   }
   initialScreenContainer.style.display = "none";

 socket.on('init', handleInit);
 socket.on('gameState', handleGameState);
 socket.on('gameOver', handleGameOver);
 socket.on('gameCode', handleGameCode);
 socket.on('unknownCode', handleUnknownCode);
 socket.on('tooManyPlayers', handleTooManyPlayers);
 socket.on('updateText', updateText);
 socket.on('disconnect', socket => {
  errorPopup("Disconnected!", "Lost connection to the server!");
});
socket.on('newPlayer', handleNewPlayer);



}

async function newGame(GameRulesJSON) {
    console.log(`Creating game`)

    let response = await fetch(`https://${SNOKE_SERVER}/creategame/`, {
      method: "POST", 
      body: JSON.stringify(GameRulesJSON)
    });

    GameInfo = await response.json();
    console.log(GameInfo);
    if (GameInfo.HostIP =! 'localhost'){
      SNOKE_SERVER = GameInfo.HostIP;
    }
    joinID = GameInfo.roomName;
    console.log(`Created game ${joinID} on ${SNOKE_SERVER}`);  
    isNewGame = true;
    joinGame();

} 

async function joinGame() {
  code = joinID ? joinID:gameCodeInput.value;
  console.log(`attempting: "${code}"`);
  targetPod = code.substring(0, code.lastIndexOf('x'));
  console.log("targetPod is:" +targetPod);

  if (!isNewGame){
    console.log("Getting Node IP");
    let response = await fetch(`https://${SNOKE_SERVER}/pod2ip/?podName=${targetPod}`);
    HostIP = await response.json();
    console.log(`Received: ${HostIP}`);
    if (!HostIP == 'localhost'){
      SNOKE_SERVER = HostIP.HostIP;
    }
  }

  handleGameCode(code)
  init();
  createSocket()
  socket.emit('joinGame', code);
}

let canvas, ctx;
let gameActive = false;

function init() {
  initialScreen.style.display = "none";
  gameScreen.style.display = "grid";
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  canvas.width = 600;
  canvas.height = 600;

  resizeCanvas();
  // canvas.width = window.innerWidth;
  // canvas.height = window.innerHeight;
  // canvas.width = canvas.height * 
  // (canvas.clientWidth / canvas.clientHeight);

ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  document.addEventListener('keydown', keydown);
  
  gameActive = true;
  highscore = getCookieValue('highscore');
  if (!getCookieValue('highscore')){
    console.log("Creating highscore cookie");
    document.cookie = "highscore=0";
  }

  playerScoreText.innerText = `Score: 0`;
  playerHighScoreText.innerText = `Highscore: ${highscore}`;
}

function keydown(e) {
  if (e != lastKey)
  {
    socket.emit('inputAction', e.keyCode);
  }
  //inputStack.push(e.keyCode);
  lastKey = e;
}

  // update snake scores 
function updateText(state, player) {
      if(player.number == playerNumber){
        playerScoreText.innerHTML = `Score: ${player.score}`;
        if (player.score > getCookieValue('highscore')){
          document.cookie = `highscore=${player.score}`;
          playerHighScoreText.innerText = `Highscore: ${getCookieValue('highscore')}`;

        }
      }
      document.getElementById(`scoreText-${state.players[i].number}`).innerHTML = `Player ${state.players[i].number}: ${state.players[i].score}`;
    }

function paintGame(state) {
  for (let i = 0; i < inputStack.length; i++){
    socket.emit('inputAction', inputStack[i]);
    inputStack.splice(i, 1)
  }
  
  // make starting snake length a property - ##TODO
 
  if(snakeTrail)
    snakeTransparency = 0.5;
   
  const food = state.food;
  const gridsize = state.gridsize;
  const size = canvas.width / gridsize;

  ctx.fillStyle = `rgba(35, 31, 32, ${snakeTransparency})`; // 0.5 adds a trailing effect
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = FOOD_COLOUR;
  ctx.fillRect(food.x * size, food.y * size, size, size);

  for (i in state.players){
    // ##TODO - improve this
    if (!document.getElementById(`scoreText-${state.players[i].number}`)){
      newTextObj = document.createElement("p")
      otherPlayerScore = document.getElementById("scoreboard-container").appendChild(newTextObj);
      otherPlayerScore.setAttribute("id",`scoreText-${state.players[i].number}` )
      updateText(state, state.players[i]);

    } 

    // only update scores as needed
    if(state.players[i].score != state.players[i].lastScore){
      updateText(state, state.players[i]);
    }
    // paint every snake
    paintPlayer(state.players[i], size, state.players[i].colour);
  }
}

function paintPlayer(playerState, size, colour) {
  const snake = playerState.snake;
  if(playerState.number == playerNumber){
    // ##TODO - add and or replace disco mode with gradient mode
    if (discoMode){
      colour = "#" + ((1<<24)*Math.random() | 0).toString(16);
      // https://stackoverflow.com/a/5365036
    }
  }


  // ##TODO - don't run this every update

  ctx.fillStyle = colour;
  for (let cell of snake) {
    if(playerState.number == playerNumber){
      updateSnokeColourToolTip(colour);

      if (rainbowMode){
        colour = "#" + ((1<<24)*Math.random() | 0).toString(16);
        ctx.fillStyle = colour;
        updateSnokeColourToolTip(colour);
      }    
    }
    ctx.fillRect(cell.x * size, cell.y * size, size, size);
  }
}

function handleInit(number) {
  playerNumber = number;
}

function handleGameState(gameState) {
  if (!gameActive || document.hidden) {
    return;
  }

  // this is the nuclear option as it will suspend the snoke gameloop if the tab loses focus
  if(!focused && !document.hidden){
    //console.log("No focus");
    return;
  }

  gameState = JSON.parse(gameState);
  requestAnimationFrame(() => paintGame(gameState));
}


// defunct
function handleGameOver(data) {
  if (!gameActive) {
    return;
  }
  data = JSON.parse(data);

  gameActive = false;

  if (data.winner === playerNumber) {
    alert('You Win!');
  } else {
    alert('You Lose :(');
  }
}

function handleGameCode(gameCode) {
  gameCodeDisplay.innerText = gameCode;
}

function handleUnknownCode() {
  reset();
  errorPopup("Invalid Code", "Invalid Game Code!");
  history.replaceState(null, '', '/');
}

function handleNewPlayer(playernumber){
  console.log("New player!");
  toast_newPlayer(playernumber);
}


// #TODO - remove
function handleTooManyPlayers() {
  reset();
  alert('This game is already in progress');
}

function reset() {
  playerNumber = null;
  gameCodeInput.value = '';
  initialScreen.style.display = "block";
  gameScreen.style.display = "none";
}








// Get the modal
var modal = document.getElementById("gameOptions_Modal");

// Get the button that opens the modal
var btn = document.getElementById("myBtn");
var newCustomGameBTN = document.getElementById("newCustomGameBTN");
newCustomGameBTN.addEventListener("click", formGameRules);
// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];
const bubble2 = document.querySelector(".bubble");

// When the user clicks the button, open the modal 
btn.onclick = function() {
  modal.style.display = "flex";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
// window.onclick = function(event) {
//   if (event.target == modal) {
//     modal.style.display = "none";
//   }
// }


// https://synaptica.info/2018/10/11/list-of-all-selected-checkboxes-into-json-string/
function formGameRules(){ 
  var m = document.getElementsByClassName('gameRulesCheckbox'); 

  var arrLen = document.getElementsByClassName('gameRulesCheckbox').length; 
  GameRulesJSON = {}; 
  for ( var i= 0; i < arrLen ; i++){  
    var  w = m[i];                     
      GameRulesJSON[w.name] = w.checked;
    }  
    GameRulesJSON["FPS"] = bubble2.speed;
    console.log( 'GameRulesJSON' + GameRulesJSON);

    modal.style.display = "none";
  newGame(GameRulesJSON);
// https://stackoverflow.com/a/47065313
 }


 const allRanges = document.querySelectorAll(".range-wrap");
 allRanges.forEach(wrap => {
  const range = wrap.querySelector(".range");
  const bubble = wrap.querySelector(".bubble");

  range.addEventListener("input", () => {
    setBubble(range, bubble);
  });
  setBubble(range, bubble);
});
// https://css-tricks.com/value-bubbles-for-range-inputs/

function setBubble(range, bubble) {
  const val = range.value;
  const min = range.min ? range.min : 0;
  const max = range.max ? range.max : 100;
  const newVal = Number(((val - min) * 100) / (max - min));
  bubble.innerHTML = `Speed: ${val}`;
  bubble.speed = val;

  // Sorta magic numbers based on size of the native UI thumb
  bubble.style.left = `calc(${newVal}% + (${0.1 - newVal * 0.15}px))`;
}




// Handle touch input 
var el = document.body;
swipedetect(el, function(swipedir){
  //swipedir contains either "none", "left", "right", "top", or "down"
  if (swipedir =='left')
      socket.emit( 'inputAction', "left");
      
  if (swipedir =='right')
  socket.emit('inputAction', "right" );

  if (swipedir =='up')
  socket.emit('inputAction', "up" );

  if (swipedir =='down')
  socket.emit('inputAction', "down" );
}
);

 // awesome code from http://www.javascriptkit.com/javatutors/touchevents2.shtml
 function swipedetect(el, callback){
  var touchsurface = el,
  swipedir,
  startX,
  startY,
  distX,
  distY,
  threshold = 50, //required min distance traveled to be considered swipe
  restraint = 500, // maximum distance allowed at the same time in perpendicular direction
  allowedTime = 10000, // maximum time allowed to travel that distance
  elapsedTime,
  startTime,
  handleswipe = callback || function(swipedir){}

  touchsurface.addEventListener('touchstart', function(e){
      var touchobj = e.changedTouches[0]
      swipedir = 'none'
      dist = 0
      startX = touchobj.pageX
      startY = touchobj.pageY
      startTime = new Date().getTime() // record time when finger first makes contact with surface
      e.preventDefault()
  }, false)

  touchsurface.addEventListener('touchmove', function(e){
      e.preventDefault() // prevent scrolling when inside DIV
  }, false)

  touchsurface.addEventListener('touchend', function(e){
      var touchobj = e.changedTouches[0]
      distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
      distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
      elapsedTime = new Date().getTime() - startTime // get time elapsed
      if (elapsedTime <= allowedTime){ // first condition for awipe met
          if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint){ // 2nd condition for horizontal swipe met
              swipedir = (distX < 0)? 'left' : 'right' // if dist traveled is negative, it indicates left swipe
          }
          else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint){ // 2nd condition for vertical swipe met
              swipedir = (distY < 0)? 'up' : 'down' // if dist traveled is negative, it indicates up swipe
          }
      }
      handleswipe(swipedir)
      e.preventDefault()
  }, false)

  document.body.addEventListener("touchstart", function (e) {
      e.preventDefault();
    
  }, false);
  document.body.addEventListener("touchend", function (e) {
      e.preventDefault();
    
  }, false);
  document.body.addEventListener("touchmove", function (e) {
      e.preventDefault();
    
  }, false);
}

function copyID(){
  copyToClipboard(`http://${location.host}/?gameID=${gameCodeDisplay.innerText}`);
  genericToast(`Copied invite link to clipboard!`, `Copied invite link!`, 1200)

}

function getCookieValue(name) {
  let result = document.cookie.match("(^|[^;]+)\\s*" + name + "\\s*=\\s*([^;]+)")
  return result ? result.pop() : ""
}
// source https://coderrocketfuel.com/article/how-to-create-read-update-and-delete-cookies-in-javascript#read-cookies



// https://komsciguy.com/js/a-better-way-to-copy-text-to-clipboard-in-javascript/
function copyToClipboard(text) {
  const listener = function(ev) {
    ev.preventDefault();
    ev.clipboardData.setData('text/plain', text);
  };
  document.addEventListener('copy', listener);
  document.execCommand('copy');
  document.removeEventListener('copy', listener);


  //   navigator.clipboard.writeText("http://snoke.ducksx3.xyz/?gameID="+gameCodeDisplay.innerText);
  // ##TODO - once HTTPS is set up
}


function updateSnokeColourToolTip(colour) {
  document.getElementById("snake-colour").style.backgroundColor = colour;
  document.getElementById('snake-colour_tooltip').innerHTML = colour;
  document.getElementById('snake-colour_tooltip').style.color = colour;
}

async function toggleDisco(){
  dmCount++;

  if(discoMode){
      discoMode = false;
      dmCount = 0;
  }
  
  if (!discoMode && dmCount >= 5){
      enableDiscoMode()
      dmCount = 0;
  }
}

function showSnokeColour(){
  if (rainbowModeCount == 0 && rainbowMode){
    rainbowMode = false;
    return;
  }
  rainbowModeCount++;
  colour = document.getElementById("snake-colour_tooltip").innerHTML;
  copyToClipboard(colour);
  genericToast(`Copied: ${colour}`, `Copied: ${colour}`, 2500);

  if(rainbowModeCount == 5){
    enableRainbowModePopup()
    rainbowModeCount = 0;
  }
}

// from -  https://exceptionshub.com/resize-html5-canvas-to-fit-window.html

function resizeCanvas() {
  var codeDisplay = document.getElementById('gameCodeContainer');

  var canvas = document.getElementById('canvas');
  var canvasRatio = canvas.height / canvas.width;
  var windowRatio = (window.innerHeight - codeDisplay.offsetHeight - 15) / window.innerWidth;
  var width;
  var height;

  if (windowRatio < canvasRatio) {
    height = window.innerHeight - codeDisplay.offsetHeight - 15;
    width = height / canvasRatio;
} else {
    width = window.innerWidth;
    height = width * canvasRatio;
}



canvas.style.width = width + 'px';
canvas.style.height = height + 'px';
};
/* <------------Popups ------------>*/



function enableDiscoMode(){

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })
  
  swalWithBootstrapButtons.fire({
    title: 'Enable disco snoke?',
    text: "Are you sure you want to enable disco snoke? WARNING: flashing colours",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    reverseButtons: false
  }).then((result) => {
    if (result.isConfirmed) {
      swalWithBootstrapButtons.fire(
        'Disco mode enabled',
        'Enabled disco mode',
        'success'
      )
      discoMode = true;
      genericToast(`Enabled disco mode!`, `Enabled disco mode!`, 1800)

    } else if (
      /* Read more about handling dismissals below */
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'Cancelled',
        'The time for disco is not now',
        'error'
      )
      discoMode = false;
    }
  })
}

function enableRainbowModePopup(){

  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: false
  })
  
  swalWithBootstrapButtons.fire({
    title: 'Enable rainbow snoke?',
    text: "Are you sure you want to enable rainbow snoke? WARNING: flashing colours",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    reverseButtons: false
  }).then((result) => {
    if (result.isConfirmed) {
      swalWithBootstrapButtons.fire(
        'Rainbow mode enabled',
        'Enabled Rainbow mode',
        'success'
      )
      rainbowMode = true;
      genericToast(`Enabled Rainbow mode!`, `Enabled Rainbow mode!`, 1800)

    } else if (
      /* Read more about handling dismissals below */
      result.dismiss === Swal.DismissReason.cancel
    ) {
      swalWithBootstrapButtons.fire(
        'Cancelled',
        'The rainbow shall shine another day',
        'error'
      )
      rainbowMode = false;
    }
  })
}



function joinGamePopup(){
  const swalWithBootstrapButtons = Swal.mixin({
    customClass: {
      confirmButton: 'btn btn-success',
      cancelButton: 'btn btn-danger'
    },
    buttonsStyling: true
  })
  
  swalWithBootstrapButtons.fire({
    title: 'Join game?',
    text: `Would you like to join game ${joinID}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Join game',
    cancelButtonText: 'Cancel!',
    reverseButtons: false
  }).then((result) => {
    if (result.isConfirmed) {
      joinGame();
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      history.replaceState(null, '', '/');

      return;
    }
  })

}


function errorPopup(title, errorMessage){
  Swal.fire({
    icon: 'error',
    title: title,
    text: errorMessage,
    //footer: '<a href="">Why do I have this issue?</a>'
  })

}

function genericToast(text, title, time){
  var toastMixin = Swal.mixin({
    toast: true,
    icon: 'success',
    title: 'General Title',
    animation: false,
    position: 'top-right',
    showConfirmButton: false,
    timer: time,
    timerProgressBar: false,
    didOpen: (toast) => {
      //toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  });
    toastText = text;
  toastMixin.fire({
    animation: true,
    title: title
  });
}

function toast_newPlayer(player){
  var toastMixin = Swal.mixin({
    toast: true,
    icon: 'success',
    title: 'General Title',
    animation: false,
    position: 'top-right',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    didOpen: (toast) => {
      //toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  });
    toastText = `New Player: ${player}`;
  toastMixin.fire({
    animation: true,
    title: toastText
  });

}

/* <------------EVENTS ------------>*/
newGameBtn.addEventListener('click', newGame);
newGameBtn.addEventListener('touchstart', newGame);
joinGameBtn.addEventListener('click', joinGame);
joinGameBtn.addEventListener('touchstart', joinGame);
copyIDButton.addEventListener('click', copyID);
copyIDButton.addEventListener('touchstart', copyID);
playerHighScoreText.addEventListener('click', async () => {toggleDisco()}, false);


document.getElementById("snake-colour").addEventListener('click', showSnokeColour);
document.getElementById("snake-colour").addEventListener('touchstart', showSnokeColour);

window.addEventListener('resize', resizeCanvas, false);


window.onfocus = function() {
    focused = true;
};
window.onblur = function() {
    focused = false;
};
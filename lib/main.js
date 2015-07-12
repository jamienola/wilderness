var gameData;
var gameCamera;
var gameWorld;
var	cursorTileLoc;
var selectedTile;

//html
var canvas = document.getElementById("canvas");
var context = canvas.getContext('2d');
var bgCanvas = document.getElementById("bgCanvas");
var bgContext = bgCanvas.getContext('2d');
var lightCanvas = document.getElementById("lightCanvas");
var lightContext = lightCanvas.getContext('2d');
var cursorCanvas = document.getElementById("cursorCanvas");
var cursorContext = cursorCanvas.getContext('2d');
var debugOut = document.getElementById("debug");

//cursor
var mouseLoc = new Point();

//frame timers
var frame = 0;
var thisFrameTime = new Date();
var lastFrameTime = thisFrameTime;

$(document).ready(init);

function init() {
  initEvents();
	initInputListeners();
  afterInit();
}

function initEvents() {  
  $('#update-seed').on('click', onChangeSeed);
  $('#seed').keyup(function onKeyUp(e) {
    if(e.keyCode == 13) {
      onChangeSeed();
    }
  });
  $('#seed').val(SEED);
}

function onChangeSeed() {
  var seed = $('#seed').val();
  if(SEED !== seed) {
    SEED = seed;
    Math.seedrandom(SEED);
    afterInit();
  }
}

function afterInit() {
	Math.seedrandom(SEED);
	initGameWorld();
	update();
}

function update() {
	frame++;
	thisFrameTime = new Date();
	var targetTimePercent = (thisFrameTime - lastFrameTime) / TARGET_FRAME_TIME;

	updateDebugPanel();
	currentGameMode.update(targetTimePercent);
	updateCursor();

	lastFrameTime = thisFrameTime;
	setTimeout(update, TARGET_FRAME_TIME);
}

function updateCursor() {
	if(cursorTileLoc) {
		cursorContext.clearRect(0, 0, canvas.width, canvas.height);
		cursorContext.beginPath();
		cursorContext.fillStyle = "rgba(255, 30, 30, 0.5)";
		var screenLoc = tileToScreen(cursorTileLoc.x, cursorTileLoc.y);
		cursorContext.fillRect(screenLoc.x, screenLoc.y, GRID_SIZE, GRID_SIZE);
		cursorContext.fill();
		cursorContext.closePath();
	}
}

function updateDebugPanel() {
	var sceneText = "";
	var cursorString = "Waiting for Cursor...";
	if(cursorTileLoc) {
		cursorString = [
			"Cursor Position: (" + mouseLoc.x + ", " + mouseLoc.y + ")",
			"Cursor Tile: (" + cursorTileLoc.x + ", " + cursorTileLoc.y + ") - " + gameWorld.getTile(cursorTileLoc.x, cursorTileLoc.y).type
		].join("<br>");
	}
	var characterString = "No Character Selected";
	if(currentGameMode.name == "Character") {
		if(gameWorld.selectedUnit.target === gameWorld.selectedUnit.position) {
			var characterPositionTileLoc = worldToTile(gameWorld.selectedUnit.position.x, gameWorld.selectedUnit.position.y);
			characterString = "Character Position: (" + characterPositionTileLoc.x + ", " + characterPositionTileLoc.y + ")";
		} else {
			var characterTargetTileLoc = worldToTile(gameWorld.selectedUnit.target.x, gameWorld.selectedUnit.target.y);
			characterString = "Character Target: (" + characterTargetTileLoc.x + ", " + characterTargetTileLoc.y + ")";
		}
	}
	var gameWorldString = "No Game World";
	if(gameWorld) {
		var hours = Math.floor(((gameWorld.timeOfDay % HALF_DAY_DURATION) + HALF_DAY_DURATION) % HALF_DAY_DURATION / HALF_DAY_DURATION * 12);
		var minutes = Math.floor(((gameWorld.timeOfDay % HOUR_DURATION) + HOUR_DURATION) % HOUR_DURATION / HOUR_DURATION * 60);

		if(hours === 0)
			hours = 12;

		if(minutes < 1)
			minutes = "00";
		else if(minutes < 10)
			minutes = "0" + minutes;

		gameWorldString = hours + ":" + minutes;

		if(Math.floor(gameWorld.timeOfDay / HALF_DAY_DURATION) === 0)
			gameWorldString += " AM";
		else
			gameWorldString += " PM";
	}
	debugOut.innerHTML = [
    '----- Debug -----',
		cursorString,
		"Game Mode: " + currentGameMode.name,
		characterString,
		gameWorldString
	].join("<br>");
}
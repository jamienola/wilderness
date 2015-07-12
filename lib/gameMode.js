

var LoadingGameMode = GameMode.extend({
  init:function() {
	this._super("Loading");
  },
  update:function(targetTimePercent) {
	this._super(targetTimePercent);
  }
});

var WorldGameMode = GameMode.extend({
  init:function(name) {
	this._super(name ? name : "World");
  },
  update:function(targetTimePercent) {
	this._super(targetTimePercent);

	gameWorld.updateTime(thisFrameTime - lastFrameTime);
	updateLights();

	updateUnits(targetTimePercent);
	if(gameWorld.isDirty) {
		drawGameWorld();
		gameWorld.isDirty = false;
	}
	drawDirtyTiles();
	drawBridges();
  },
  onMouseMove:function() {
	this._super();
	if(mouseIsDown) {
		gameCamera.x -= (mouseLoc.x - lastMouseLoc.x);
		gameCamera.y -= (mouseLoc.y - lastMouseLoc.y);
		gameWorld.isDirty = true;
	}
	cursorTileLoc = screenToTile(mouseLoc.x, mouseLoc.y);
  },
  onMouseDown:function() {
	selectedTile = cursorTileLoc;
  },
  onMouseUp:function() {
	if(selectedTile == cursorTileLoc) this.onMouseClick();
  },
  onMouseClick:function() {
  	var tile = gameWorld.getTile(cursorTileLoc.x, cursorTileLoc.y);
  	if(tile.isOccupied) {
  		gameWorld.selectedUnit = tile.unit;
  		gameWorld.units.push(gameWorld.units.splice(gameWorld.units.indexOf(tile.unit), 1)[0]);
  		currentGameMode = GAME_MODES.CHARACTER_SELECTED;
  	}
  },
  onRightDown:function() {
	 selectedTile = cursorTileLoc;
  },
  onRightUp:function() {
	 if(selectedTile == cursorTileLoc) this.onRightClick();
  },
  onRightClick:function() {
  }
});

var CharacterSelectedMode = WorldGameMode.extend({
	init:function() {
		this._super("Character");
	},
	onMouseClick:function() {
		currentGameMode = GAME_MODES.GAME_WORLD;
		gameWorld.selectedUnit = null;
		this._super();
	},
	onRightUp:function() {
		this._super();
		var tile = gameWorld.getTile(cursorTileLoc.x, cursorTileLoc.y);
		if(tile.isAvailable())
			sendUnitToTile(gameWorld.selectedUnit, cursorTileLoc.x, cursorTileLoc.y);
	}
});

var GAME_MODES = {
	"LOADING": new LoadingGameMode(),
	"GAME_WORLD": new WorldGameMode(),
	"CHARACTER_SELECTED": new CharacterSelectedMode()
};

var currentGameMode = GAME_MODES.LOADING;
var FPS_TARGET = 60;
var TARGET_FRAME_TIME = 1000 / FPS_TARGET;

var GRID_SIZE = 16;
var SEED = "654684654657";
//Rooms
var ROOM_TYPES = {
	"BRIDGE": "bridge",
	"CLOAK": "cloak",
	"EMPTY": "empty",
	"ENGINE": "engine",
	"DOORS": "doors",
	"MEDICAL": "medical",
	"OXYGEN": "oxygen",
	"ROBOTS": "robots",
	"SENSORS": "sensors",
	"SHIELD": "shield",
	"TELEPORTER": "teleporter",
	"WEAPONS": "weapons"
};
var ROOM_COLORS = {};
ROOM_COLORS[ROOM_TYPES.BRIDGE] =		"#edd42c";
ROOM_COLORS[ROOM_TYPES.CLOAK] =			"#666699";
ROOM_COLORS[ROOM_TYPES.EMPTY] =			"#a0c0a0";
ROOM_COLORS[ROOM_TYPES.ENGINE] =		"#cc6633";
ROOM_COLORS[ROOM_TYPES.DOORS] =			"#993366";
ROOM_COLORS[ROOM_TYPES.MEDICAL] =		"#c44040";
ROOM_COLORS[ROOM_TYPES.OXYGEN] =		"#49aad7";
ROOM_COLORS[ROOM_TYPES.ROBOTS] =		"#525566";
ROOM_COLORS[ROOM_TYPES.SENSORS] =		"#8aA056";
ROOM_COLORS[ROOM_TYPES.SHIELD] =		"#d796d7";
ROOM_COLORS[ROOM_TYPES.TELEPORTER] =	"#336699";
ROOM_COLORS[ROOM_TYPES.WEAPONS] =		"#a02d7b";

//Tiles
var TILE_TYPES = {
	"GRASS": "Grass",
	"TALL_GRASS": "Tall Grass",
	"DIRT": "Dirt",
	"LAVA": "Lava",
	"WATER": "Water",
	"DEEP_WATER": "Deep Water",
	"SAND": "Sand",
	"WET_SAND": "Wet Sand",
	"FOREST": "Forest",
	"DARK_FOREST": "Dark Forest",
	"ROCK": "Rock",
	"SNOW": "Snow"
};

var TILE_COLORS = {};
TILE_COLORS[TILE_TYPES.GRASS] =			"#30c030";
TILE_COLORS[TILE_TYPES.TALL_GRASS] =	"#20b020";
TILE_COLORS[TILE_TYPES.DIRT] =			"#505000";
TILE_COLORS[TILE_TYPES.LAVA] =			"#c03030";
TILE_COLORS[TILE_TYPES.WATER] =			"#4050c0";
TILE_COLORS[TILE_TYPES.DEEP_WATER] =	"#3040b0";
TILE_COLORS[TILE_TYPES.SAND] =			"#A0A040";
TILE_COLORS[TILE_TYPES.WET_SAND] =		"#909030";
TILE_COLORS[TILE_TYPES.FOREST] =		"#209020";
TILE_COLORS[TILE_TYPES.DARK_FOREST] =	"#106010";
TILE_COLORS[TILE_TYPES.ROCK] =			"#8080D0";
TILE_COLORS[TILE_TYPES.SNOW] =			"#D0D0F0";

BRIDGE_TYPE_DOOR = "door";

//Units
UNIT_SPEED = 3;

//Time
FULL_DAY_LENGTH = 60000;
HALF_DAY_DURATION = FULL_DAY_LENGTH * 0.5;
HOUR_DURATION = FULL_DAY_LENGTH / 24;
DAY_NIGHT_TRANSITION_TIME = HOUR_DURATION * 2;
SUNRISE_START_TIME = FULL_DAY_LENGTH * 0.25;
SUNSET_START_TIME = FULL_DAY_LENGTH * 0.75;

//Light
DAY_LIGHT_LEVEL = 1;
NIGHT_LIGHT_LEVEL = 0.45;
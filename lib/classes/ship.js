var Ship = Class.extend({
  init:function(name, rooms, doors, width, height) {
	this.name = name;
	this.rooms = rooms;
	this.doors = doors;
	this.width = width;
	this.height = height;
  }
});

var Room = Class.extend({
	init:function(x, y, width, height, type) {
		this.upgraded = false;
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.type = type;
		this.debugColor = ROOM_COLORS[type];
	}
});

var Door = Point.extend({
	init:function(x, y) {
		this._super(x, y);
	}
});

function createShip(shipConfig) {
	var width = 0;
	var height = 0;

	var rooms = [];
	for(var roomKey in shipConfig.rooms) {
		var roomConfig = shipConfig.rooms[roomKey];
		var type = roomConfig["-type"] ? roomConfig["-type"] : ROOM_TYPES.EMPTY;
		var room = new Room(
			parseInt(roomConfig["-x"], 10),
			parseInt(roomConfig["-y"], 10),
			parseInt(roomConfig["-width"], 10),
			parseInt(roomConfig["-height"], 10),
			type
		);

		if(room.x + room.width > width) width = room.x + room.width;
		if(room.y + room.height > height) height = room.y + room.height;
		rooms.push(room);
	}

	var doors = [];
	for(var doorKey in shipConfig.doors) {
		var doorConfig = shipConfig.doors[doorKey];
		var door = new Door(
			parseFloat(doorConfig["-x"], 10),
			parseFloat(doorConfig["-y"], 10)
		);
		doors.push(door);
	}

	var ship = new Ship(shipConfig["-name"], rooms, doors, width, height);
	return ship;
}
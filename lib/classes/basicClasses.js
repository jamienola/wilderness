/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

  // The base Class implementation (does nothing)
  this.Class = function(){};

  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;

    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;

    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;

            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];

            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);
            this._super = tmp;

            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }

    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }

    // Populate our constructed prototype object
    Class.prototype = prototype;

    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;

    // And make this class extendable
    Class.extend = arguments.callee;

    return Class;
  };
})();

var Point = Class.extend({
  init:function(x, y) {
    if(!x) x=0;
    if(!y) y=0;
    this.x = parseFloat(x, 10);
    this.y = parseFloat(y, 10);
  }
});

var Rectangle = Class.extend({
  init:function(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
});

var Tile = Point.extend({
  init:function(x, y){
    this._super(x, y);
    this.type = TILE_TYPES.DEFAULT;
    this.isOccupied = false;
    this.isReserved = false;
    this.avoidClear = false;
  },
  occupy:function(unit) {
    this.unit = unit;
    this.isOccupied = true;
    this.isReserved = false;
    gameWorld.saveTile(this);
  },
  reserve:function() {
    this.isReserved = true;
    gameWorld.saveTile(this);
  },
  avoidNextClear:function() {
    this.avoidClear = true;
  },
  clear:function() {
    this.unit = null;
    this.isReserved = false;
    this.isOccupied = false;
    gameWorld.saveTile(this);
  },
  isAvailable:function() {
    var result = !this.isOccupied && !this.isReserved;
    return result;
  },
  isEqual:function(tile) {
    var result = tile.x == this.x &&
      tile.y == this.y &&
      tile.type == this.type &&
      tile.isOccupied == this.isOccupied &&
      tile.isReserved == this.isReserved;
    return result;
  }
});

var GameMode = Class.extend({
  init:function(name) {
    this.name = name;
  },
  update:function(targetTimePercent) {

  },
  onMouseMove:function() {},
  onMouseDown:function() {},
  onMouseUp:function() {},
  onMouseClick:function() {},
  onRightDown:function() {},
  onRightUp:function() {},
  onRightClick:function() {}
});

var Camera = Point.extend({
  init:function(x, y) {
    this._super(x, y);
    this.lastPosition = new Point(x, y);
  }
});

var Unit = Class.extend({
  init:function() {
    this.position = new Point();
    this.direction = Math.PI * 1.5;
    this.target = new Point();
    this.path = [];
    this.speed = UNIT_SPEED;
    this.pathfinder = null;
    this.stopAtNextPoint = false;
  }
});

var Light = Class.extend({
  init:function(_x, _y, _brightness, _range) {
    this.x = _x;
    this.y = _y;
    this.brightness = _brightness;
    this.range = _range;
    this.tiles = [];

    var range = (this.range - 1) * GRID_SIZE;
    var radius = this.range + 1;
    var currentPoint = new Point(0, 0);

    //get adjacent points from one octant
    while(currentPoint.y <= radius) {
      var dist = pointDistance(new Point(), new Point(currentPoint.x, currentPoint.y));
      if(dist <= radius) {
        var lightPercent = 1 - (dist / radius);
        var lightLevel = Math.sin(lightPercent * Math.PI/2) * this.brightness;
        this.tiles.push({
          "x": currentPoint.x,
          "y": currentPoint.y,
          "lightLevel":lightLevel
        });
        var isOnAxis = currentPoint.x === 0 || currentPoint.y === 0 || currentPoint.x == currentPoint.y;

        if(dist > 0) {
          if(isOnAxis) {
            //point is on the axis, so only copy to 3 raidal points
            this.tiles.push({"x": -currentPoint.y, "y":  currentPoint.x, "lightLevel": lightLevel});
            this.tiles.push({"x": -currentPoint.x, "y": -currentPoint.y, "lightLevel": lightLevel});
            this.tiles.push({"x":  currentPoint.y, "y": -currentPoint.x, "lightLevel": lightLevel});
          } else {
            //point is not on the axis, so copy to 7 radial points
            this.tiles.push({"x": -currentPoint.y, "y": -currentPoint.x, "lightLevel": lightLevel});
            this.tiles.push({"x": -currentPoint.y, "y":  currentPoint.x, "lightLevel": lightLevel});

            this.tiles.push({"x":  currentPoint.x, "y": -currentPoint.y, "lightLevel": lightLevel});
            this.tiles.push({"x": -currentPoint.x, "y": -currentPoint.y, "lightLevel": lightLevel});

            this.tiles.push({"x":  currentPoint.y, "y":  currentPoint.x, "lightLevel": lightLevel});
            this.tiles.push({"x":  currentPoint.y, "y": -currentPoint.x, "lightLevel": lightLevel});

            this.tiles.push({"x": -currentPoint.x, "y":  currentPoint.y, "lightLevel": lightLevel});
          }
        }
      }
      if(currentPoint.x < currentPoint.y && dist <= radius)
        currentPoint.x++;
      else {
        currentPoint.x = 0;
        currentPoint.y++;
      }
    }
  }
});

var Bridge = Class.extend({
  init:function(_x, _y, _pointA, _pointB, _type) {
    this.x = _x;
    this.y = _y;
    this.pointA = _pointA;
    this.pointB = _pointB;
    this.type = _type;

    this.key = getBridgeKey(_pointA, _pointB);
  }
});
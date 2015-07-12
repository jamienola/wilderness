var worldData;
var lastCameraLocation;

var GameWorld = Class.extend({
	init:function() {
		worldData = {};
		gameCamera = new Camera(0, 0);
    lastCameraLocation = new Point();
		currentGameMode = GAME_MODES.GAME_WORLD;

		this.buffer = document.createElement('canvas');
		this.buffer.width = canvas.width;
		this.buffer.height = canvas.height;
		this.units = [];
		this.lights = [];
		this.litTiles = {};
		this.bridges = {};
		this.sunlightLevel = null;
		this.lastSunlightLevel = null;
		this.dirtyTiles = [];
		this.selectedUnit = null;
		this.isDirty = true;
		this.lightsAreDirty = false;
		this.timeOfDay = SUNRISE_START_TIME - 2;

		PerlinSimplex.noiseDetail(0, 0);
		PerlinSimplex.setRng(Math);
	},
	updateTime:function(milliseconds) {
		this.timeOfDay  = (((this.timeOfDay + milliseconds) % FULL_DAY_LENGTH) + FULL_DAY_LENGTH) % FULL_DAY_LENGTH;
	},
	flagDirtyTile:function(tile) {
		this.dirtyTiles.push(tile);
	},
	getTile:function(x, y) {
		var tile = worldData[getTileKey(x, y)];
		if(!tile) {
			tile = getGeneratedTile(x, y);
		}
		return tile;
	},
	saveTile:function(tile) {
		worldData[getTileKey(tile.x, tile.y)] = tile;
		if(tile.isEqual(getGeneratedTile(tile.x, tile.y))) {
			this.deleteTile(tile);
		}
		this.flagDirtyTile(tile);
	},
	deleteTile:function(tile) {
		worldData[getTileKey(tile.x, tile.y)] = null;
	},
	addBridge:function(_bridge) {
		this.bridges[_bridge.key] = _bridge;
	},
	deleteBridge:function(_bridge) {
		this.bridges[_bridge.key] = null;
	},
	addUnit:function(x, y) {
    var coords = this.findClosestAvailableTile(x, y, null, true);
		var tile = this.getTile(coords.x/GRID_SIZE, coords.y/GRID_SIZE);
		if(!tile.isOccupied) {
			this.units.push(createUnit(tile, this.units.length));
		}
    this.addLight(new Light(x, y, 1, 15));
		this.saveTile(tile);
	},
	addLight:function(light) {
		for(var i=0, len=this.lights.length; i<len; i++) {
			if(this.lights[i].x == light.x && this.lights[i].y == light.y)
				return;
		}
		this.lights.push(light);
		this.lightsAreDirty = true;
	},
    isAllowed:function(currentPoint, targetPoint) {
		var result = false;
        var targetTile = this.getTile(targetPoint.x, targetPoint.y);
		var currentTile = null;
		if(currentPoint) {
			currentTile = this.getTile(currentPoint.x, currentPoint.y);
		}

        if(targetTile.type === "Water" || 
          targetTile.type === "Deep Water" ||
          targetTile.type === "Lava" ||
          targetTile.type === "Rock") {
			result = false;
		} else if(currentTile === null || currentTile.type === targetTile.type) {
			result = true;
		} else if(isShipTile(currentTile) || isShipTile(targetTile)) {
			// var key = "";
			// if(currentTile.x < targetTile.x || currentTile.y < targetTile.y) {
			// 	key = getBridgeKey(currentTile, targetTile);
			// } else {
			// 	key = getBridgeKey(targetTile, currentTile);
			// }

			// var bridge = this.bridges[key];
			// if(bridge && bridge.type === BRIDGE_TYPE_DOOR) {
			// 	console.log(bridge.x, bridge.y);
			// 	result = true;
			// } else {
				result = false;
			// }
        } else {
			result = true;
		}
		return result;
    },
	findClosestAvailableTile:function(x, y, unitPosition, skipDebug) {
		// --------- debug ARTS -----------
    if(!skipDebug) {
  		bgContext.beginPath();
  		bgContext.fillStyle = "rgba(255, 0, 0, 0.25)";
    }
		// -------- end debug -------

		var startingPoint = new Point(x, y);
		if(gameWorld.isAllowed(null, startingPoint)) {
      return tileToWorld(x, y);
    }    
    
    var closestTile = null;
		var testedPoints = [
			getTileKey(x, y)
		];
		if(!unitPosition) {
			unitPosition = new Point(x, y);
    }

		//make sweeping circles, testing each point only once. when one is found, return it.
		while(closestTile === null) {
			var pointsToTest = null;
			var dist = Infinity;
			var reachedEndOfOctant = false;
			var currentPoint = new Point(startingPoint.x, startingPoint.y);

			//get adjacent points from one octant
			while(!reachedEndOfOctant) {
				var xDiff = currentPoint.x - x;
				var yDiff = currentPoint.y - y;
				var currentDist = Math.abs(xDiff * xDiff) + Math.abs(yDiff * yDiff);

				if(currentDist <= dist) {
					if(currentDist < dist) {
						dist = currentDist;
						pointsToTest = [];
					}
					pointsToTest.push(new Point(currentPoint.x, currentPoint.y));
				}

				if(xDiff >= -yDiff) {
					reachedEndOfOctant = true;
				} else {
					//if the next point down isn't tested, switch to it.
					var nextPoint = new Point(currentPoint.x, currentPoint.y + 1);
					if(!testedPoints[getTileKey(nextPoint.x, nextPoint.y)])
						currentPoint.y++;
					else
						currentPoint.x++;
				}
			}

			//test each new point radially. If a match is found, record it and break.
			for(var i=0, len=pointsToTest.length; i<len; i++) {
				var point = pointsToTest[i];
				var isOnAxis = point.x == x || point.y == y || Math.abs(point.x - x) == Math.abs(point.y - y);
				var radialPoints = [point];
				var offset = new Point(point.x - x, point.y - y);

				if(dist > 0) {
					if(isOnAxis) {
						//point is on the axis, so only test 4 raidal points
						radialPoints.push(new Point(x - offset.y, y + offset.x));
						radialPoints.push(new Point(x - offset.x, y - offset.y));
						radialPoints.push(new Point(x + offset.y, y - offset.x));
					} else {
						//point is not on the axis, so test all 8 radial points
						radialPoints.push(new Point(x - offset.y, y - offset.x));
						radialPoints.push(new Point(x - offset.y, y + offset.x));

						radialPoints.push(new Point(x + offset.x, y - offset.y));
						radialPoints.push(new Point(x - offset.x, y - offset.y));

						radialPoints.push(new Point(x + offset.y, y + offset.x));
						radialPoints.push(new Point(x + offset.y, y - offset.x));

						radialPoints.push(new Point(x - offset.x, y + offset.y));
					}
				}
				//test each radial point
				var closestTiles = [];
				for(var rp=0, rpLen=radialPoints.length; rp<rpLen; rp++) {
					var radialPoint = radialPoints[rp];
					var radialTile = gameWorld.getTile(radialPoint.x, radialPoint.y);
					if(radialTile.isAvailable() && gameWorld.isAllowed(null, radialPoint)) {
						closestTiles.push(radialPoint);
					}

					// --------- debug ARTS -----------
					if(!skipDebug) {
  		      var screenPoint = tileToScreen(radialPoint.x, radialPoint.y);
					 bgContext.fillRect(screenPoint.x, screenPoint.y, GRID_SIZE, GRID_SIZE);
          }
					// -------- end debug -------

					testedPoints[getTileKey(radialPoint.x, radialPoint.y)] = true;
				}

				if(closestTiles.length) {
					var distToUnit = Infinity;
					for(var c=0, cLen=closestTiles.length; c<cLen; c++) {
						var worldPoint = tileToWorld(closestTiles[c].x, closestTiles[c].y);
						var worldDist = pointDistance(worldPoint, unitPosition);
						if(worldDist < distToUnit) {
							distToUnit = worldDist;
							closestTile = worldPoint;
						}
					}
				}

				// --------- debug ARTS -----------
				if(!skipDebug) {
		      bgContext.fill();
				  bgContext.closePath();
        }
				// -------- end debug -------
			}
			startingPoint.y--;
		}
		var closest = worldToTile(closestTile.x, closestTile.y);
		return closestTile;
	}
});

function isShipTile(tile) {
	var result = false;
	switch(tile.type) {
		case "bridge":
		case "cloak":
		case "empty":
		case "engine":
		case "doors":
		case "medical":
		case "oxygen":
		case "robots":
		case "sensors":
		case "shield":
		case "teleporter":
		case "weapons":
			result = true;
			break;
	}
	return result;
}

function getTileKey(x, y) {
	var key = x + "," + y;
	return key;
}

function getBridgeKey(pointA, pointB) {
	var key =  pointA.x + "," + pointA.y + "," + pointB.x + "," + pointB.y;
	return key;
}

function createUnit(tile, index) {
	var unit = new Unit();
	unit.tile = tile;
	unit.position = new Point(
		tile.x * GRID_SIZE + HALF_GRID_SIZE,
		tile.y * GRID_SIZE + HALF_GRID_SIZE
	);
	unit.target = unit.position;
  unit.index = index;
	tile.occupy(unit);
	return unit;
}

//Uses Perlin Simplex for noise, applying Fractal Brownian Motion
function getGeneratedTile(x, y) {
var gain = 0.5;
var hgrid = 130;
var lacunarity = 2;
var octaves = 5;

	var result = 0;
	var frequency = 1/hgrid;
	var amplitude = gain;

	for (i = 0; i < octaves; ++i)
	{
		result += PerlinSimplex.noise(x * frequency, y * frequency) * amplitude;
		frequency *= lacunarity;
		amplitude *= gain;
	}

	var tile = new Tile(x, y);
	if(result <= 0.25) {
		tile.type = TILE_TYPES.DEEP_WATER;
	} else if(result <= 0.35) {
		tile.type = TILE_TYPES.WATER;
	} else if(result < 0.375) {
		tile.type = TILE_TYPES.WET_SAND;
	} else if(result <= 0.4) {
		tile.type = TILE_TYPES.SAND;
	} else if(result <= 0.5) {
		tile.type = TILE_TYPES.DIRT;
	} else if(result <= 0.6) {
		tile.type = TILE_TYPES.GRASS;
	} else if(result <= 0.68) {
		tile.type = TILE_TYPES.TALL_GRASS;
	}else if(result <= 0.72) {
		tile.type = TILE_TYPES.FOREST;
	} else if(result <= 0.8) {
		tile.type = TILE_TYPES.DARK_FOREST;
	} else if(result <= 0.85) {
		tile.type = TILE_TYPES.ROCK;
	} else if(result <= 0.88) {
		tile.type = TILE_TYPES.LAVA;
	} else {
		tile.type = TILE_TYPES.SNOW;
	}
	return tile;
}

function updateLights() {
	//fade in/out sunlight
	if(gameWorld.timeOfDay < SUNRISE_START_TIME) {
		gameWorld.sunlightLevel = NIGHT_LIGHT_LEVEL;
	} else if(gameWorld.timeOfDay < SUNRISE_START_TIME + DAY_NIGHT_TRANSITION_TIME) {
		var sunriseProgress = (gameWorld.timeOfDay - SUNRISE_START_TIME) / DAY_NIGHT_TRANSITION_TIME;
		gameWorld.sunlightLevel = NIGHT_LIGHT_LEVEL - easeInOut(sunriseProgress) * (NIGHT_LIGHT_LEVEL - DAY_LIGHT_LEVEL);
	} else if(gameWorld.timeOfDay < SUNSET_START_TIME) {
		gameWorld.sunlightLevel = DAY_LIGHT_LEVEL;
	} else if(gameWorld.timeOfDay < SUNSET_START_TIME + DAY_NIGHT_TRANSITION_TIME) {
		var sunsetProgress = (gameWorld.timeOfDay - SUNSET_START_TIME) / DAY_NIGHT_TRANSITION_TIME;
		gameWorld.sunlightLevel = DAY_LIGHT_LEVEL - easeInOut(sunsetProgress) * (DAY_LIGHT_LEVEL - NIGHT_LIGHT_LEVEL);
	} else {
		gameWorld.sunlightLevel = NIGHT_LIGHT_LEVEL;
	}

	//only update lights if sunlight has changed or the camera moved while the brightness is less than 1
	if(gameWorld.lightsAreDirty || gameWorld.sunlightLevel != gameWorld.lastSunlightLevel ||
		(gameWorld.sunlightLevel < 1 && (gameCamera.x !== lastCameraLocation.x || gameCamera.y !== lastCameraLocation.y))) {
		lightContext.clearRect(0, 0, canvas.width, canvas.height);
		lightContext.beginPath();
		lightContext.fillStyle = "rgba(0, 0, 0, " + (1 - gameWorld.sunlightLevel) + ")";
		lightContext.fillRect(0, 0, canvas.width, canvas.height);
		lightContext.fill();
		lightContext.closePath();

		var firstTile = screenToTile(0, 0);
		var lastTile = screenToTile(canvas.width, canvas.height);
		gameWorld.litTiles = {};

		for(var l=0, lLen=gameWorld.lights.length; l<lLen; l++) {
			var light = gameWorld.lights[l];
			if(light.x >= firstTile.x - light.range &&
				light.x <= lastTile.x + light.range &&
				light.y >= firstTile.y - light.range &&
				light.y <= lastTile.y + light.range) {

				for(var t=0, tLen=light.tiles.length; t<tLen; t++) {
					var tile = light.tiles[t];
					if(light.x + tile.x >= firstTile.x && light.y + tile.y >= firstTile.y &&
						light.x + tile.x <= lastTile.x && light.y + tile.y <= lastTile.y) {

						var lightLevel = tile.lightLevel;
						var key = getTileKey(tile.x + light.x, tile.y + light.y);

						if(gameWorld.litTiles[key])
							lightLevel += gameWorld.litTiles[key];
						gameWorld.litTiles[key] = lightLevel;

						var tileScreenLoc = tileToScreen(light.x + tile.x, light.y + tile.y);
						lightContext.clearRect(
							tileScreenLoc.x,
							tileScreenLoc.y,
							GRID_SIZE,
							GRID_SIZE
						);
						lightContext.beginPath();
						lightContext.fillStyle = "rgba(0, 0, 0, " + (1 - lightLevel - gameWorld.sunlightLevel) + ")";
						lightContext.fillRect(
							tileScreenLoc.x,
							tileScreenLoc.y,
							GRID_SIZE,
							GRID_SIZE
						);
						lightContext.fill();
						lightContext.closePath();
					}
				}
			}
		}
	}
	gameWorld.lightsAreDirty = false;
	gameWorld.lastSunlightLevel = gameWorld.sunlightLevel;
}

function drawGameWorld() {
	//how far the camera moved this frame
	var moveDistance = new Point(gameCamera.x - lastCameraLocation.x, gameCamera.y - lastCameraLocation.y);

	//take a snapshot of the section of screen that doesn't need to be refreshed and save it to the buffer
	var bufferContext = gameWorld.buffer.getContext('2d');
	bufferContext.clearRect(0, 0, gameWorld.buffer.width, gameWorld.buffer.height);
	var copyLoc = new Point(Math.max(moveDistance.x, 0), Math.max(moveDistance.y, 0));
	var pasteLoc = new Point(Math.max(-moveDistance.x, 0), Math.max(-moveDistance.y, 0));
	var size = new Point(
		bgCanvas.width - Math.abs(moveDistance.x),
		bgCanvas.height - Math.abs(moveDistance.y)
	);
	if(size.x == canvas.width && size.y == canvas.height) {
		size.x = 0;
		size.y = 0;
	} else {
		bufferContext.drawImage(bgCanvas, copyLoc.x, copyLoc.y, size.x, size.y, pasteLoc.x, pasteLoc.y, size.x, size.y);
	}

	//clear the canvas after saving the buffer
	bgContext.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

	//first and last tile that appear on the screen
	var startingLocation = screenToTile(0, 0);
	var endLocation = screenToTile(canvas.width - 1, canvas.height - 1);

	//the screen location of each tile
	var tileScreenLoc = tileToScreen(startingLocation.x, startingLocation.y);
	var cachedTileScreenY = tileScreenLoc.y;

	//the Y locations that we can skip to to avoid iterating through cached tiles
	var firstScreenYUnderCopyArea = tileScreenLoc.y + Math.floor((size.y - tileScreenLoc.y) / GRID_SIZE) * GRID_SIZE;
	var firstTileYUnderCopyArea = startingLocation.y + Math.ceil(firstScreenYUnderCopyArea / GRID_SIZE);

	//iterate through available tiles and only update the ones that weren't on the screen last frame
	for(x=startingLocation.x; x<=endLocation.x; x++) {
		tileScreenLoc.y = cachedTileScreenY;
		for(y=startingLocation.y; y<=endLocation.y; y++) {
			if(tileScreenLoc.x > pasteLoc.x && tileScreenLoc.x < pasteLoc.x + size.x - GRID_SIZE) {
				if(pasteLoc.y > 0 && tileScreenLoc.y > pasteLoc.y) {
					//this column is done, so skip to the next one.
					break;
				}
				if(pasteLoc.y === 0 && tileScreenLoc.y < firstScreenYUnderCopyArea) {
					tileScreenLoc.y = firstScreenYUnderCopyArea;
					y = firstTileYUnderCopyArea - 1;
					continue;
				}
			}

			var tile = gameWorld.getTile(x, y);
			drawTile(tile, tileScreenLoc);

			tileScreenLoc.y += GRID_SIZE;
		}
		if(tileScreenLoc.x > bgCanvas.width + GRID_SIZE)
			tileScreenLoc.x = startingLocation.x;
		tileScreenLoc.x += GRID_SIZE;
	}

	/*
	bgContext.beginPath();
	bgContext.strokeStyle = "#ff0000";
	bgContext.strokeRect(pasteLoc.x, pasteLoc.y, size.x, size.y);
	bgContext.stroke();
	bgContext.closePath();
	*/

	bgContext.drawImage(gameWorld.buffer, 0, 0);

	//draw grid lines
	/*bgContext.beginPath();
	bgContext.strokeStyle = "#000000";
	var gridOffset = new Point(
		(GRID_SIZE-1) - (((gameCamera.x - HALF_CANVAS_WIDTH) % GRID_SIZE) + GRID_SIZE) % GRID_SIZE,
		(GRID_SIZE-1) - (((gameCamera.y - HALF_CANVAS_HEIGHT) % GRID_SIZE) + GRID_SIZE) % GRID_SIZE
	);
	for(var x = gridOffset.x; x<bgCanvas.width; x+=GRID_SIZE) {
		bgContext.moveTo(x+0.5, 0);
		bgContext.lineTo(x+0.5, bgCanvas.height);
		bgContext.stroke();
	}
	for(var y=gridOffset.y; y<bgCanvas.height; y+= GRID_SIZE) {
		bgContext.moveTo(0, y+0.5);
		bgContext.lineTo(bgCanvas.width, y+0.5);
		bgContext.stroke();
	}
	bgContext.closePath();*/

	lastCameraLocation.x = gameCamera.x;
	lastCameraLocation.y = gameCamera.y;
}

function drawTile(tile, tileScreenLoc) {
	bgContext.beginPath();
	// load color from rooms or regular tiles. If that fails. EXXXXXXTREME GREEN TO THE M-M-M-MAX!!!
	if(ROOM_TYPES[tile.type.toUpperCase()])
		bgContext.fillStyle = ROOM_COLORS[ROOM_TYPES[tile.type.toUpperCase()]];
	else if(TILE_COLORS[tile.type])
		bgContext.fillStyle = TILE_COLORS[tile.type];
	else
		bgContext.fillStyle = "#00ff00";

  if(!tile.avoidClear) {
  	bgContext.fillRect(
  		tileScreenLoc.x,
  		tileScreenLoc.y,
  		GRID_SIZE,
  		GRID_SIZE
  	);
  	bgContext.fill();
  	bgContext.closePath();
  } else {
    tile.avoidClear = false;
  }

	if(tile.isReserved) {
		bgContext.beginPath();
		bgContext.fillStyle = "#0030C0";
		bgContext.arc(
			tileScreenLoc.x + HALF_GRID_SIZE,
			tileScreenLoc.y + HALF_GRID_SIZE,
			GRID_SIZE * 0.25,
			0,
			Math.PI * 2
		);
		bgContext.fill();
		bgContext.closePath();
	}
}

function drawDirtyTiles() {
	for(var i=0, len=gameWorld.dirtyTiles.length; i<len; i++) {
		var tile = gameWorld.dirtyTiles[i];
		var screenLoc = tileToScreen(tile.x, tile.y);

		if(screenLoc.x > -GRID_SIZE &&
			screenLoc.x < bgCanvas.width &&
			screenLoc.y > -GRID_SIZE &&
			screenLoc.y < bgCanvas.height)
		{
			drawTile(tile, screenLoc);
		}
	}

	gameWorld.dirtyTiles = [];
}

function updateUnits(targetTimePercent) {
	context.clearRect(0, 0, canvas.width, canvas.height);

	for(var i=0, len=gameWorld.units.length; i<len; i++) {
		var unit = gameWorld.units[i];

		if(unit.target !== unit.position) {
			var distToTravel = unit.speed * targetTimePercent;
			moveUnit(unit, distToTravel);
		}

		var screenPosition = worldToScreen(unit.position.x, unit.position.y);
		if(screenPosition.x >= -HALF_GRID_SIZE &&
			screenPosition.x <= canvas.width + HALF_GRID_SIZE &&
			screenPosition.y >= -HALF_GRID_SIZE &&
			screenPosition.y <= canvas.height + HALF_GRID_SIZE) {

			var screenLocation = worldToScreen(unit.position.x, unit.position.y);
			context.beginPath();
			context.lineWidth = 1;
			if(unit == gameWorld.selectedUnit) {
				context.fillStyle = "#FFFFFF";
				context.strokeStyle = "#000000";
			} else {
				context.fillStyle = "#000000";
				context.strokeStyle = "#FFFFFF";
			}
			context.arc(screenLocation.x, screenLocation.y, GRID_SIZE * 0.35, 0, Math.PI*2);
			context.fill();
			context.stroke();
			context.closePath();

			context.beginPath();
			context.strokeStyle = unit == gameWorld.selectedUnit ? "#000000" : "#FFFFFF";
			context.lineWidth = 2;
			context.moveTo(screenLocation.x, screenLocation.y);
			var movedPoint = movePoint(screenLocation, unit.direction, HALF_GRID_SIZE);
			context.lineTo(movedPoint.x, movedPoint.y);
			//weird hack. remove this post haste:
			context.moveTo(0, 0);
			context.lineTo(-1, 0);
			// -----------------
			context.stroke();
			context.closePath();
		} else {
      var SCREEN_BUFFER = 30;
      var pointerStart = {
        x: Math.max(SCREEN_BUFFER, Math.min(canvas.width - SCREEN_BUFFER, screenPosition.x)),
        y: Math.max(SCREEN_BUFFER, Math.min(canvas.height - SCREEN_BUFFER, screenPosition.y))
      };
      var angle = Math.atan2(screenPosition.y - pointerStart.y, screenPosition.x - pointerStart.x);
      var pointerEnd = {
        x: Math.cos(angle + Math.PI) * 12 + pointerStart.x,
        y: Math.sin(angle + Math.PI) * 12 + pointerStart.y
      };
      var leftArrowLine = {
        x: Math.cos(angle + Math.PI * 0.75) * 5 + pointerStart.x,
        y: Math.sin(angle + Math.PI * 0.75) * 5 + pointerStart.y
      };
      var rightArrowLine = {
        x: Math.cos(angle + Math.PI * 1.25) * 5 + pointerStart.x,
        y: Math.sin(angle + Math.PI * 1.25) * 5 + pointerStart.y
      };
      
      context.beginPath();
      context.lineCap = 'round';
      context.strokeStyle = unit == gameWorld.selectedUnit ? "#000000" : "#FFFFFF";
      context.lineWidth = 2;
      context.moveTo(pointerStart.x, pointerStart.y);
      context.lineTo(pointerEnd.x, pointerEnd.y);
      context.moveTo(pointerStart.x, pointerStart.y);
      context.lineTo(leftArrowLine.x, leftArrowLine.y);
      context.moveTo(pointerStart.x, pointerStart.y);
      context.lineTo(rightArrowLine.x, rightArrowLine.y);
      context.stroke();
      context.closePath();
    }

		if(unit.pathfinder) {
			if(unit.pathfinder.isActive) {
				unit.pathfinder.update();
			}
			else
				unit.pathfinder = null;
		}
	}
}

function moveUnit(unit, distToTravel) {
	var distToNextWaypoint = pointDistance(unit.position, unit.path[0]);
	if(distToNextWaypoint <= distToTravel) {
		if(unit.path.length > 1) {
			//arrived at a waypoint, but still not at target
			unit.position = unit.path[0];
			if(unit.stopAtNextWaypoint) {
				//clear old target tile
				var oldTargetLoc = worldToTile(unit.target.x, unit.target.y);
				var oldTargetTile = gameWorld.getTile(oldTargetLoc.x, oldTargetLoc.y);
        oldTargetTile.avoidNextClear();
				oldTargetTile.clear();
				//next waypoint is now the target
				unit.target = unit.position;
				var waypointLoc = worldToTile(unit.position.x, unit.position.y);
				var waypointTile = gameWorld.getTile(waypointLoc.x, waypointLoc.y);
				//stop unit at this waypoint
				console.log("stopping at next point", waypointTile.x, waypointTile.y, "old target:", oldTargetLoc.x, oldTargetLoc.y);
				unit.stopAtNextWaypoint = false;
        waypointTile.avoidNextClear();
				waypointTile.occupy(unit);
				unit.path = [];
			} else {
				unit.path.splice(0, 1);
				unit.direction = getAngle(unit.position, unit.path[0]);
				distToTravel -= distToNextWaypoint;
				moveUnit(unit, distToTravel);
			}
		} else {
			//unit is at target
			unit.position = unit.target;
			var tileLoc = worldToTile(unit.position.x, unit.position.y);
			var targetTile = gameWorld.getTile(tileLoc.x, tileLoc.y);
      targetTile.avoidNextClear();
			targetTile.occupy(unit);
			unit.path = [];
			if(unit.pathfinder) unit.pathfinder = null;
		}
	} else {
		//unit moves toward target
		unit.position = movePoint(unit.position, unit.direction, distToTravel);
	}
  var light = gameWorld.lights[unit.index];
  var lightPosition = worldToTile(unit.position.x, unit.position.y);
  light.x = lightPosition.x;
  light.y = lightPosition.y;
  gameWorld.lightsAreDirty = true;
}

function drawBridges() {
	var halfDoorWidth = Math.floor(GRID_SIZE * 1/4);
	var halfDoorThickness = Math.floor(3 * 0.5);

	bgContext.strokeStyle = "rgba(0, 0, 0, 1)";
	bgContext.fillStyle = "#808080";
	bgContext.lineWidth = 0.5;

	for(var bridgeKey in gameWorld.bridges) {
		var bridge = gameWorld.bridges[bridgeKey];
		if(bridge.type === BRIDGE_TYPE_DOOR) {
			var rect;
			var bridgeScreenLoc = tileToScreen(bridge.x, bridge.y);
			if(bridge.x % 1 === 0)
				rect = new Rectangle(
					bridgeScreenLoc.x - halfDoorThickness,
					bridgeScreenLoc.y - halfDoorWidth,
					halfDoorThickness * 2,
					halfDoorWidth * 2
				);
			else if(bridge.y % 1 === 0)
				rect = new Rectangle(
					bridgeScreenLoc.x - halfDoorWidth,
					bridgeScreenLoc.y - halfDoorThickness,
					halfDoorWidth * 2,
					halfDoorThickness * 2
				);
			bgContext.beginPath();
			bgContext.fillRect(rect.x, rect.y, rect.width, rect.height);
			bgContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
			bgContext.fill();
			bgContext.stroke();
		}
	}
}

function importShips() {
	//TEMPORARILY DISPLAY SHIPS
	var lastShipHeight = 1;
	var offsetX = 1;
	for(var shipKey in gameData.data.ships) {
		var ship = createShip(gameData.data.ships[shipKey]);
		for(var i=0, len=ship.rooms.length; i<len; i++) {
			var room = ship.rooms[i];
			//bgContext.fillStyle = room.debugColor;
			for(var x=room.x; x<room.x + room.width; x++) {
				for(var y=room.y; y<room.y + room.height; y++) {
					var tile = new Tile(x + offsetX, y + lastShipHeight);
					tile.type = room.type;
					gameWorld.saveTile(tile);
				}
			}
		}
		for(i=0, len=ship.doors.length; i<len; i++) {
			var door = ship.doors[i];
			var pointA = new Point(Math.floor(offsetX + door.x), Math.floor(lastShipHeight + door.y));
			var pointB = new Point(Math.ceil(offsetX + door.x), Math.ceil(lastShipHeight + door.y));
			var bridge = new Bridge(offsetX + door.x, lastShipHeight + door.y, pointA, pointB, BRIDGE_TYPE_DOOR);
			gameWorld.addBridge(bridge);
		}
		lastShipHeight += (ship.height + 1);
	}
}

function initGameWorld() {
	gameWorld = new GameWorld();
	// Removed ships for the demo
  //importShips();
	createUnits();
}

function createUnits() {
	gameWorld.addUnit(-15, 0);
	gameWorld.addUnit(15, 0);
	gameWorld.addUnit(85, 40);
}

function sendUnitToTile(unit, x, y) {
	var tilePosition = gameWorld.findClosestAvailableTile(x, y, unit.position);
	var targetLoc = new Point(
		tilePosition.x + HALF_GRID_SIZE,
		tilePosition.y + HALF_GRID_SIZE
	);

	//TODO: Unit states. Test for movement here.
	if(unit.path.length) {
		if(unit.pathfinder) {
			unit.pathfinder.stop();
			unit.pathfinder = null;
		}
		unit.stopAtNextWaypoint = true;
		console.log("stopping unit", worldToTile(targetLoc.x, targetLoc.y).x, worldToTile(targetLoc.x, targetLoc.y).y);
	}

	unit.pathfinder = new Pathfinder(
		worldToTile(unit.position.x, unit.position.y),
		worldToTile(targetLoc.x, targetLoc.y),
		true,
		function(path) {
			var newTileLoc = worldToTile(tilePosition.x, tilePosition.y);
			var tile = gameWorld.getTile(newTileLoc.x, newTileLoc.y);
			if(path && path.length > 1 && tile.isAvailable()) {
				var oldTargetLoc = worldToTile(unit.target.x, unit.target.y);
				var oldTargetTile = gameWorld.getTile(oldTargetLoc.x, oldTargetLoc.y);
        oldTargetTile.avoidNextClear();
				oldTargetTile.clear();

				var rebuiltPath = [];

				// --- debug ARTS ----
					var screenLocation = worldToScreen(unit.position.x, unit.position.y);
          bgContext.beginPath();
          bgContext.fillStyle = "#0030C0";
					bgContext.arc(
      			screenLocation.x,
      			screenLocation.y,
      			GRID_SIZE * 0.25,
      			0,
      			Math.PI * 2
      		);
      		bgContext.fill();
          bgContext.closePath();
          
          bgContext.beginPath();
          bgContext.strokeStyle = "#0030C0";
					bgContext.lineWidth = 2;
					bgContext.moveTo(screenLocation.x, screenLocation.y);
				// -----------------

				for(var i=0, len=path.length; i<len; i++) {
					if(i > 0) {
						var point = tileToWorld(path[i].x, path[i].y);
						rebuiltPath.push(new Point(
							point.x + HALF_GRID_SIZE,
							point.y + HALF_GRID_SIZE
						));
					}

					// --- debug ARTS ----
						var screenPoint = tileToScreen(path[i].x, path[i].y);
						bgContext.lineTo(screenPoint.x + HALF_GRID_SIZE, screenPoint.y + HALF_GRID_SIZE);
					// -----------------
				}

				unit.target = targetLoc;
				unit.path = rebuiltPath;
				unit.direction = getAngle(unit.position, rebuiltPath[0]);
				unit.stopAtNextWaypoint = false;

				// --- debug ARTS ----
					bgContext.stroke();
					bgContext.closePath();
				// -----------------

        tile.avoidNextClear();
				tile.reserve(true);
			}
		}
	);
}
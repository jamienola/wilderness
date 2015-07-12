# The Wilderness
  
A personal prototype from 2013, when I was first teaching myself how to use JavaScript. Created primarily for learning the language, but also for testing terrain generation & pathfinding algorithms, designing and constructing a game engine, and optimizing rendering using an HTML5 canvas.
  
**Note: While most of my professional work is on GitHub, it is all in private repositories which are owned by my employer. I am currently working on updating GitHub with more of my personal work in order to have more publically-accessible code samples. This project is several years old and represents my skill set before using JavaScript professionally.**
  
The Wilderness is a procedurally-generated game world that extends infinitely in every direction. Game units have a number of pathfinding behaviors to help them traverse the world and avoid obstacles.

#####Click here to try it for yourself: http://www.jamienola.com/wilderness

## How to Use

Interaction is very simple. Just click on a game unit to select it (it will turn white when you do), then right click where you want it to go. There are no limits on how far they can travel, but keep in mind the pathfinding algorithm is slowed down for demonstration purposes, so larger distances may take a long time, depending on what's in the way. 

In the following screenshot, the unit on the left is selected and the one on the right is not. Once a unit is selected, the player can right-click anywhere on the game world to make the unit start moving. Left-clicking the ground will cause a selected unit to become deselected.

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/units.png" target="_blank">
![Game Units](https://github.com/jamienola/wilderness/raw/master/img/thumbs/units.png "Game Units")
</a>

Clicking and dragging on the background will scroll the game world. If units are off-screen, arrows are added along the borders so that players don't lose track of them. Arrows share the same colors as units, but inverted. That way it's easy to know which off-screen unit is selected.

## Terrain Generation

Terrain in The Wilderness is procedurally generated by first using Perlin Simplex for noise, then adding Fractal Brownian Motion, which smooths out distribution. This process repeats a set number of times, and then produces a number between 0 and 1 for any particular set of coordinates. The result represents the height of the world at that coordinate's location, with 0 being the lowest possible point, and 1 being the highest. That height then used to determine what type of terrain should be displayed at any given set of coordinates. Players can input a seed for the terrain generator to use, and the same seed will always generate an identical world. 

Generation happens any time the game needs to access a tile of the world. If that tile's coordinates do not exist in an array of saved tiles, it uses the terrain generating algorithm to calculate what should be in that space. The happens when the tile first shows up on the screen, when a unit is pathfinding and hits a given tile, and when a tile has been manually marked as dirty and is picked up in the next render loop.
  
Because of the way The Wilderness generates terrain, there is no practical limit for how large the world can be. Players can scroll in any direction forever and never hit the edge of the world.

## Pathfinding

Units will walk around obstacles such as water, rocks, lava, and snow. This was a challenge because in a world with infinitely-generating terrain it can be downright impossible to determine if a target location is inaccessible. I put a lot of work into making the algorithm efficient and allowing it to take some key shortcuts to speed up calculation.

Let's say the unit in the next screenshot wants to get to the red dot. He can't swim, so we have to get him to walk around the lake as efficiently as possible.

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/pathfinding_1.png" target="_blank">
![Before Pathfinding](https://github.com/jamienola/wilderness/raw/master/img/thumbs/pathfinding_1.png "Before Pathfinding")
</a>

**The process of pathfinding in the live demo has been slowed down in order to illustrate how it works.**

Units can move in eight directions, so we begin by checking tiles in each of the eight directions from the starting location. Those tiles are then compared to each other to see which is closer to the target. We continue searching, using a heavily modified A* algorithm with a Jump Point Search optimization (to increase efficiency and accuracy) until we arrive at the target. Once a tile has been checked, it is never checked again. The debug overview on the game shows which points have been checked, with lines coming from any preceeding points. The dark blue line is the path the unit ends up deciding to take.

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/pathfinding_2.png" target="_blank">
![After Pathfinding](https://github.com/jamienola/wilderness/raw/master/img/thumbs/pathfinding_2.png "After Pathfinding")
</a>

Pathfinding nodes are drawn on the screen to illustrate what the algorithm is doing. In the above example, the unit is trying to walk around a lake. The pathfinding algorithm progressively searches for an available path to the target location, which it finds by going around the North end of the lake. As you can see, the unit would have approached from the South if the North path was blocked.

In situations when the target is on a space that the unit isn't allowed to visit, such as water or lava, The pathfinder locates the nearest available point. It does this by progressively testing the closest square to the target inside one octant of a circle, then duplicating that seven times radially. Doing it this way is eight times as efficient since distance calculations only happen in the first octant, and then the result is cached for the seven others. In the following example, let's say the unit wants to go to the point in the center of the small pond.

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/closest_available_point_1.png" target="_blank">
![An Inaccessible Tile](https://github.com/jamienola/wilderness/raw/master/img/thumbs/closest_available_point_1.png "An Inaccessible Tile")
</a>

Since that point is inaccessible, the pathfinder tests surrounding points radially until discovering a point that is available. The unit then automatically begins finding the fastest path to the new target point.

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/closest_available_point_2.png" target="_blank">
![Finding the Closest Point](https://github.com/jamienola/wilderness/raw/master/img/thumbs/closest_available_point_2.png "Finding the Closest Point")
</a>

## Lighting & Day/Night Cycle

Lighting is calculated only at times when the world's sunlight drops below 100%. Daylight begins to fade at 6pm and reaches full darkness at 8pm, easing in and out using a Sine equation.

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/day_night_1.png" target="_blank">
![Day Time](https://github.com/jamienola/wilderness/raw/master/img/thumbs/day_night_1.png "Day Time")
</a>

In the morning, daylight begins to return at 6am and by 8am the world is fully lit. While it is dark, lighting is calculated for each tile around on-screen and nearby units. During this time, lighting calculations happen only when the world's sunlight changes, an on-screen unit moves, or a tile needs to be redrawn due to the player scrolling the screen.

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/day_night_2.png" target="_blank">
![Night Time](https://github.com/jamienola/wilderness/raw/master/img/thumbs/day_night_2.png "Night Time")
</a>

## Rendering and Efficiency

World tiles are only calculated and redrawn under certain circumstances. 
* When the player drags the screen, a bitmap image of the existing HTML5 canvas is copied into memory, moved, and written back to the canvas in the new location. Only tiles that are ouside this bitmap or along the borders need to be calculated and redrawn, so scrolling around the world is very efficient.
* Tiles can be marked as needing an update while remaining on the screen if they are near a light (or lit unit) while the world's lighting is changing, if a lit unit is moving and gets close to the tile, or if a unit has the tile set as its pathfinding target.

**To clear the screen of the debug overlay, just move the camera until the section you want to clear is off-screen, then move it back on-screen. The debug lines and shapes only stay on the screen until the background tiles underneath them are regenerated.**

## License

  MIT
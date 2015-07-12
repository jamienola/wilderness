# The Wilderness
  
A personal prototype from 2013, when I was first teaching myself how to use JavaScript. 
  
**Note: While most of my professional work is on GitHub, it is all in private repositories which are owned by my employer. I am currently working on updating GitHub with more of my personal work in order to have more publically-accessible code samples.** 
  
The Wilderness is a procedurally-generated game world that extends infinitely in every direction. Game units have a number of pathfinding behaviors to help them traverse the world and avoid obstacles.

## How to Use

Interaction is very simple. Just click on a game unit to select it (it will turn white when you do), then right click where you want it to go. There are no limits on how far they can travel, but keep in mind the pathfinding algorithm is slowed down for demonstration purposes, so it may take a long time for larger distances.

Clicking and dragging on the background will scroll the game world. If units are off-screen, arrows are added along the borders so users can't lose their units.

## Terrain Generation

Terrain in The Wilderness is procedurally generated by first using Perlin Simplex for noise, then adding Fractal Brownian Motion, which smooths out distribution. Users can input a seed for the terrain generator to use, and the same seed will always generate an identical world. 

Generation happens any time the game needs to access a tile of the world. If that tile's coordinates do not exist in an array of saved tiles, it uses the terrain generating algorithm to calculate what should be in that space. The happens when the tile first shows up on the screen, when a unit is pathfinding and hits a given tile, and when a tile has been manually marked as dirty and is picked up in the next render loop.
  
Because of the way The Wilderness generates terrain, there is no practical limit for how large the world can be. Users can scroll in any direction and never hit the edge of the world.

## Pathfinding

Units will walk around obstacles such as water, rocks, lava, and snow. This was a challenge because in a world with infinitely-generating terrain it can be downright impossible to determine if a target location is inaccessible. 

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/pathfinding_1.png" target="_blank">
![Before Pathfinding](https://raw.githubusercontent.com/jamienola/wilderness/master/img/thumbs/pathfinding_1.png"Before Pathfinding")
</a>

The process of pathfinding has been slowed down in order to illustrate how it works. Starting at the unit location. tiles in eight directions are tested and compared to each other using a heavily modified A* algorithm that uses Jump Point Search to increase efficiency and accuracy. 

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/pathfinding_2.png" target="_blank">
![After Pathfinding](https://raw.githubusercontent.com/jamienola/wilderness/master/img/thumbs/pathfinding_2.png"After Pathfinding")
</a>

Pathfinding nodes are drawn on the screen to illustrate what the algorithm is doing. In this example, the unit is trying to walk around a pond. The pathfinding algorithm progressively searches for an available path to the target location, which it finds by going around the South end of the pond. As you can see, if that way was blocked, it would have approached from the North.

In situations when the target is on a space that the unit isn't allowed to visit, such as water or lava, The pathfinder locates the nearest available point. It does this by progressively testing each square inside each octant of a circle, then duplicating that 7 times radially. Doing it this way is 8 times as efficient since distance calculations only happen in the first octant, not every one. In the following example, let's say the unit wants to go to the point in the center of the small pond.

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/closest_available_point_1.png" target="_blank">
![After Pathfinding](https://raw.githubusercontent.com/jamienola/wilderness/master/img/thumbs/closest_available_point_1.png"After Pathfinding")
</a>

Since that point is inaccessible, the pathfinder tests surrounding points radially until discovering a point that is available. The unit then automatically begins finding the fastest path to the new target point.

<a href="https://raw.githubusercontent.com/jamienola/wilderness/master/img/closest_available_point_2.png" target="_blank">
![After Pathfinding](https://raw.githubusercontent.com/jamienola/wilderness/master/img/thumbs/closest_available_point_2.png"After Pathfinding")
</a>

## Lighting & Day/Night Cycle

## Rendering

## License

  MIT

var mouseDownLoc = new Point();
var lastMouseLoc = new Point();
var mouseIsDown = false;

function updateMouseLoc() {
	lastMouseLoc = mouseLoc;
}

function initInputListeners() {
	window.onmousemove = onMouseMove;
	cursorCanvas.onmousedown = onMouseDown;
	window.onmouseup = onMouseUp;
}

function onMouseMove(e) {
	var rect = canvas.getBoundingClientRect();
	mouseLoc = new Point(e.clientX - rect.left, e.clientY - rect.top);
	currentGameMode.onMouseMove();
	updateMouseLoc();
}

function onMouseDown(e) {
	if(e.button < 2) {
		mouseDownLoc = mouseLoc;
		mouseIsDown = true;
		currentGameMode.onMouseDown();
	} else {
		currentGameMode.onRightDown();
	}
}

function onMouseUp(e) {
	if(e.button < 2) {
		mouseIsDown = false;
		currentGameMode.onMouseUp();
	} else {
		currentGameMode.onRightUp();
	}
}

/* General Notes
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * Textures are merely another method of setting
 * the color for any point on an object. Since 
 * colors are specified by fragment shaders, the 
 * fragment shader would handle this.  
 * 
 * 
 * 
*/

// ============================================ //
// Global Variables
// ============================================ //
var gl;

var shaderProgram;

//model-view matrix (state)
var mvMatrix = mat4.create();
//projection matrix (perspective`)
var pMatrix = mat4.create();

//preGPU buffers to hold object attributes.
var triVertexPositionBuffer;
var triVertexColorBuffer;
var quadVertexPositionBuffer;
//Color buffer for coloring vertices.
var quadVertexColorBuffer;
//color buffer for texturing vertices.
var quadTextureBuffer
var quadVertexIndexBuffer;

//global vars to track rotation.
//var rTri = 0;
//var rQuad = 0;
var xRot = 0;
var yRot = 0;
var zRot = 0;

//time keeper
var lastTime = 0;

//Model view & project matrices and handlers
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var mvMatrixStack = [];

//textures
var neheTexture //since tut based on NeHe GL tuts.

// ============================================ //
// Math  & Primitive Functions
// ============================================ //

//converts degrees to radians.
function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

/* removes an item from the mvMatrixStack
 * should be implemented as an object or as a
 * the stack primitive. 
 */
function mvPopMatrix() {
	if (mvMatrixStack.length == 0) {
	  throw "There's nothing to pop in mvMatrixStack!";
	}
	mvMatrix = mvMatrixStack.pop();
	return true;
}

/* pushes a copy of mvMatrix to the mvMatrixStack
 * should be implemented as an object or as a
 * the stack primitive. 
 */
function mvPushMatrix() {
	var copy = mat4.create();
	mat4.set(mvMatrix, copy);
	mvMatrixStack.push(copy);
	return true;
}

// ============================================ //
// WebGL Environment Setup
// ============================================ //

//Initialize the webGL environment.
function initGL(canvas) {
	try {
		gl = WebGLUtils.setupWebGL(canvas);
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
	} catch (e) {
	}
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
	return true;
}

//Pull shader scripts from the html
function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

//
function initShaders() {
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");
	
	//get a webgl program to hold the shaders. 
	shaderProgram = gl.createProgram();
	//attach the shaders
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	//initialize the shaders.
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	gl.useProgram(shaderProgram);
	
	//get vertex position as a reference and pass it
	//to the shader.
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	//initialize the vertex position var as an array.
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
	//get vertex color as a reference and pass it
	//to the shader.
	shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
	//initialize the vertex position var as an array.
	gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
	
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	return true;
}

//
function handleLoadedTexture(texture) {
	//set the current texture. 
	//All texture operations will operate on this texture (rather than taking a parameter).
	/* works similarly to the bindBuffer pattern:
	 * - set current buffer
	 * - operate on said buffer
	 * - reset current buffer to work on next buffer
	 */
	gl.bindTexture(gl.TEXTURE_2D, texture);
	//flip the coordinate system since images' use
	//a y-flipped cartesian system.
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	//upload texture image to the GPU texture space
	// using texImage2D. 
	// (imageType,detailLevel, format, format, channel datatype, imageFileRef)
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
	//specify scaling parameter when texture >> image (MAG_FILTER) that is, how to scale up
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	//specify scaling parameter when texture << image (MIN_FILTER) that is, how to scale up
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	//tidy up.
    gl.bindTexture(gl.TEXTURE_2D, null);
	return true;
}

//
function initTexture(){
	//create texture reference
	texture = gl.createTexture();
	//add js image object  as an property.
	texture.image = new Image();
	//set crossOrigin context?
	texture.image.crossOrigin = "anonymous";
	//add callback method
	texture.image.onload = function() {
		handleLoadedTexture(texture);
	}
	//load the texture image.
	/* Note: the image is loaded asynchronously; 
	 * the call to load the image is returned 
	 * immediately and a background thread is
	 * started to load the image. Once it's 
	 * finished loading, the callback function is
	 * triggered.
	*/
	texture.image.src = "nehe.gif";
	return true;
}

//
function setMatrixUniforms() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	return true;
}

// ============================================ //
// Buffer Definitions
// ============================================ //
/* Buffers hold the attributes of our objects 
 * for when they're passed to the GPU (vertices, 
 * colors, etc.)*/

function initTriBuffers(){
	triVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, triVertexPositionBuffer);
	var vertices = [
		 // Front face
         1.0,  1.0,  1.0, //Right Top front
         1.0, -1.0, -1.0, //Right Bottom back
        -1.0,  1.0, -1.0, //Left Top Back
        // Right face
         1.0,  1.0,  1.0, //Right Top front
         1.0, -1.0, -1.0, //Right Bottom back
       -1.0, -1.0,  1.0, //Left Bottom Front
        // Back face
         1.0,  1.0,  1.0, //Right Top front
        -1.0,  1.0, -1.0, //Left Top Back
        -1.0, -1.0,  1.0, //Left Bottom Front
        // Left face
         1.0, -1.0, -1.0, //Right Bottom back
		-1.0,  1.0, -1.0, //Left Top Back
		-1.0, -1.0,  1.0, //Left Bottom Front
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	triVertexPositionBuffer.itemSize = 3;
	triVertexPositionBuffer.numVertices = 12;
	
	//declare the color buffer
	triVertexColorBuffer = gl.createBuffer();
	//bind it to the GL as a buffer array
	gl.bindBuffer(gl.ARRAY_BUFFER, triVertexColorBuffer);
	//specify the vertex colors in RGBa
	//webgl will interpolate the rest.
	var colors = [
		// Front face
		1.0, 0.0, 0.0, 1.0,  //Right Top front 
		1.0, 0.8, 0.0, 1.0,  //Right Bottom back
		0.2, 0.0, 0.7, 1.0,  //Left Top Back
		// Right face
		1.0, 0.0, 0.0, 1.0,  //Right Top front
		1.0, 0.8, 0.0, 1.0,  //Right Bottom back
		0.0, 0.9, 0.0, 1.0,  //Left Bottom Front
		// Back face
		1.0, 0.0, 0.0, 1.0,  //Right Top front
		0.2, 0.0, 0.7, 1.0,  //Left Top Back
		0.0, 0.9, 0.0, 1.0,  //Left Bottom Front
		// Left face
		1.0, 0.8, 0.0, 1.0,  //Right Bottom back
		0.2, 0.0, 0.7, 1.0,  //Left Top Back
		0.0, 0.9, 0.0, 1.0,  //Left Bottom Front
	];
	//initialize the buffer
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	//set characteristic attributes.
	triVertexColorBuffer.itemSize = 4;
	triVertexColorBuffer.numVertices = 12;
	return true;
}

function quadvertexBuffer(){
	//handle vertex positions.
	quadVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPositionBuffer);
	vertices = [
	 // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,

      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,

      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,

      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,

      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,

      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	quadVertexPositionBuffer.itemSize = 3;
	quadVertexPositionBuffer.numVertices = 24;
}

function quadColorVertexCoords(){
	//handle vertex colors
	quadVertexColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexColorBuffer);
	//specify the color of each face
	colors = [
		[1.0, 0.0, 0.0, 1.0],     // Front face
		[1.0, 1.0, 0.0, 1.0],     // Back face
		[0.0, 1.0, 0.0, 1.0],     // Top face
		[1.0, 0.5, 0.5, 1.0],     // Bottom face
		[1.0, 0.0, 1.0, 1.0],     // Right face
		[0.0, 0.0, 1.0, 1.0],     // Left face
    ];
	//generate the colors for each vertex.
    var unpackedColors = [];
    for (var i in colors) {
		var color = colors[i];
		for (var j=0; j < 4; j++) {
			unpackedColors = unpackedColors.concat(color);
		}
    }
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedColors), gl.STATIC_DRAW);
	quadVertexColorBuffer.itemSize = 4;
	quadVertexColorBuffer.numVertices = 24;
	
	return true;
}

function quadTextureVertices(){
	quadTextureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadTextureBuffer);
    //specify texture coordinates for each vertex
	//(x,y) maps the vertex to the xy coordinates
	// in the texture. Coords are in 'units' where
	// 1u(x) = image.width && 1u(y) = image.height
	// webgl handles the conversion to px.
	var textureCoords =[
		// Front face
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,

		// Back face
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,

		// Top face
		0.0, 1.0,
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,

		// Bottom face
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,
		1.0, 0.0,

		// Right face
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,

		// Left face
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    quadTextureBuffer.itemSize = 2;
    quadTextureBuffer.numItems = 24;
	}

function quadElementBuffer(){
	//element array buffer
	quadVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadVertexIndexBuffer);
    var quadVertexIndices = [
		0, 1, 2,      0, 2, 3,    // Front face
		4, 5, 6,      4, 6, 7,    // Back face
		8, 9, 10,     8, 10, 11,  // Top face
		12, 13, 14,   12, 14, 15, // Bottom face
		16, 17, 18,   16, 18, 19, // Right face
		20, 21, 22,   20, 22, 23  // Left face
    ]
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quadVertexIndices), gl.STATIC_DRAW);
    quadVertexIndexBuffer.itemSize = 1; //these are indices
    quadVertexIndexBuffer.numItems = 36;
	return true;
}

function initQuadBuffers(){
	quadvertexBuffer();
	//quadColorVertexCoords();
	quadTextureVertices();
	quadElementBuffer();
	
	return true;
}

//
function initBuffers() {
  //triangular object
	initTriBuffers();

  //quad object
	initQuadBuffers();
	return true;
}

// ============================================ //
// Drawing
// ============================================ //

function drawTri() {
	mat4.translate(mvMatrix, [-1.5, 0.0, -7.0]);
	
	//push the mvMatrix onto a stack to store its 
	//state
	mvPushMatrix();
	mat4.rotate(mvMatrix, degToRad(rTri), [-1, 1, -1]);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, triVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, triVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	//bind to the GL
	gl.bindBuffer(gl.ARRAY_BUFFER, triVertexColorBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, triVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

	setMatrixUniforms();
	gl.drawArrays(gl.TRIANGLES, 0, triVertexPositionBuffer.numVertices);
	
	//remove the current matrix; and take one from
	//the top of the stack?
	mvPopMatrix();
	return true
}

function  bindQuadPositionToShaders(){
	gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, quadVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	return true;
}

function bindVertexColorToShaders(){
	gl.bindBuffer(gl.ARRAY_BUFFER, quadVertexColorBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, quadVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
}

function bindTextureToShaders(){
	//typical buffer binding and shader attribute pointing
	gl.bindBuffer(gl.ARRAY_BUFFER, quadTextureBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, quadTextureBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	//get the active texture
	/*
	 * Note: webgl can hold up to 32 textures during
	 * any call to functions ()
	 */
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, neheTexture);
	//pass '0' to the shader uniform to be extracted
	//in initShaders. (it' sthe texture index)
	gl.uniform1i(shaderProgram.samplerUniform, 0);
}

function drawQuad(){
	//push quad's mvMatrix
	mat4.translate(mvMatrix, [3.0, 0.0, 0.0]);
	
	//rotate mvMatrix around [X axis, Y axis, Z axis]
	//since mvMatrix is shared for both objects,
	//the quad's position *must* be recalcuated
	//before applying the rotation, otherwise,
	// it'd rotate about the tri's origin 
	// rather than it own. 
	//mvPushMatrix();
	//mat4.rotate(mvMatrix, degToRad(rQuad),[1, 1, 1]);
	
	//bind to the GL so shaders may access it.
	bindQuadPositionToShaders();
	//bindVertexColorToShaders();
	bindTextureToShaders();
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadVertexIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, quadVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

	//pop quad's mvMatrix
	//mvPopMatrix
	return true;
}

//
function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

	mat4.identity(mvMatrix);
	
	//shift deeper into the screen
	mat4.translate(mvMatrix, [0.0, 0.0, -5.0]);
	//  !!! can this be reduced to one function call? !!!
    mat4.rotate(mvMatrix, degToRad(xRot), [1, 0, 0]);
    mat4.rotate(mvMatrix, degToRad(yRot), [0, 1, 0]);
    mat4.rotate(mvMatrix, degToRad(zRot), [0, 0, 1]);

	//drawTri();
	drawQuad();
	return true;
}

//since the frequency at which requestAnimFrame is
//called will vary from user to user, the animation 
//calculation updates the rotation angle based of the interval
//since the last update. Users would then see the
//same range of motion regardless of their 
//machine's clockspeed.
function animate() {
	var timeNow = new Date().getTime();
	if (lastTime != 0) {
		var elapsed = timeNow - lastTime;

		//rTri += (90 * elapsed) / 1000.0;
		//rQuad += (75 * elapsed) / 1000.0;
		xRot += (90 * elapsed) / 1000.0;
		yRot += (90 * elapsed) / 1000.0;
		zRot += (90 * elapsed) / 1000.0;
	}
	lastTime = timeNow;
	return true;
}

//
function updateScene(){
	//Use google's webgl-utils to schedule this 
	//function to be called again @60 FPS.
	requestAnimFrame(updateScene);
	drawScene();
	animate();
	return true;
}

//
function webGLStart() {
	var canvas = document.getElementById("canvasEnvironment");
	initGL(canvas);
	initShaders();
	initBuffers();
	initTexture();

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	updateScene();
	return true;
}

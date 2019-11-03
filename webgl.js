"use strict";

// Variable that holds the locations of variables in the shader for us
var lc;

var gl;
var program;
var fps, fpsInterval, now, then;

var canvas;
var width;
var height;

var windowSize = 600;

var up_pressed = false;
var down_pressed = false;
var left_pressed = false;
var right_pressed = false;

// Define observer variables:
var X_u_obs = [0., 99., Math.PI/2., 0.];
var U_u_obs = construct_U_vector(X_u_obs);
var u_u_obs = [0., 0., 0.05, 0.];
var k_u_obs = [0., -1., 0., 0.];
k_u_obs = normalize_null(X_u_obs, k_u_obs);

var levciv = make_levciv();

// Set up data structure for tetrad-based camera look directions
var camvecs;

// Initialize metric to zeroes, we will fill it later
var g_uu = [
	    0., 0., 0., 0.,
	    0., 0., 0., 0.,
	    0., 0., 0., 0.,
	    0., 0., 0., 0.
];

var g_dd = [
	    0., 0., 0., 0.,
	    0., 0., 0., 0.,
	    0., 0., 0., 0.,
	    0., 0., 0., 0.
];

// This function populates the camera vectors in the local tetrad frame.
function makecamvecs(xpix, ypix, fovx, fovy) {
  var cv = new Array(xpix);
  for (var i = 0; i < xpix; i++) {
    cv[i] = new Array(ypix);
    for (var j = 0; j < ypix; j++) {
      cv[i][j] = new Array(4);
      var stepx = fovx / xpix;
      var stepy = fovy / ypix;
      var alpha = -fovx * 0.5 + (i + 0.5) * stepx;
      var beta  = -fovy * 0.5 + (j + 0.5) * stepy;
      var plane_dist = 30.;
      var norm = Math.sqrt(alpha * alpha + beta * beta + plane_dist * plane_dist);
      var ux = alpha / norm;
      var uy = beta / norm;
      var uz = plane_dist / norm;
      cv[i][j][0] = 1.;
      cv[i][j][1] = ux;
      cv[i][j][2] = uy;
      cv[i][j][3] = uz;
    }
  }
  return cv;
}

function make_levciv() {
  var levciv = new Array(4);
  for (var i = 0; i < 4; i++) {
    levciv[i] = new Array(4);
    for (var j = 0; j < 4; j++) {
      levciv[i][j] = new Array(4);
      for (var k = 0; k < 4; k++) {
        levciv[i][j][k] = new Array(4);
	for (var l = 0; l < 4; l++) {
	  if (i == j || i == k || i == l || j == k || j == l || k == l) levciv[i][j][k][l] = 0.;
	  else levciv[i][j][k][l] = ((i-j) * (i-k) * (i-l) * (j-k) * (j-l) * (k-l)) / 12.;
	}
      }
    }
  }
  return levciv;
}

function construct_tetrad_u(X_u_obs, U_u_obs, u_u_obs, k_u_obs) {
  var local_g_uu = metric_uu(X_u_obs);
  var local_g_dd = metric_dd(X_u_obs);
  var e_u = [
	     [0., 0., 0., 0.],
	     [0., 0., 0., 0.],
	     [0., 0., 0., 0.],
	     [0., 0., 0., 0.]
             ];
  e_u[0][0] = U_u_obs[0];
  e_u[1][0] = U_u_obs[1];
  e_u[2][0] = U_u_obs[2];
  e_u[3][0] = U_u_obs[3];
  var omega = -inner_product(X_u_obs, k_u_obs, U_u_obs);
  e_u[0][3] = k_u_obs[0] / omega - U_u_obs[0];
  e_u[1][3] = k_u_obs[1] / omega - U_u_obs[1];
  e_u[2][3] = k_u_obs[2] / omega - U_u_obs[2];
  e_u[3][3] = k_u_obs[3] / omega - U_u_obs[3];
  var U_d = lower_index(X_u_obs, U_u_obs);
  var k_d = lower_index(X_u_obs, k_u_obs);
  var beta = inner_product(X_u_obs, U_u_obs, u_u_obs);
  var Ccursive = inner_product(X_u_obs, k_u_obs, u_u_obs) / omega - beta;
  var b2 = inner_product(X_u_obs, u_u_obs, u_u_obs);
  var Ncursive = Math.sqrt(b2 + beta * beta - Ccursive * Ccursive);
  e_u[0][1] = (u_u_obs[0] + beta * U_u_obs[0] - Ccursive * e_u[0][3]) / Ncursive;
  e_u[1][1] = (u_u_obs[1] + beta * U_u_obs[1] - Ccursive * e_u[1][3]) / Ncursive;
  e_u[2][1] = (u_u_obs[2] + beta * U_u_obs[2] - Ccursive * e_u[2][3]) / Ncursive;
  e_u[3][1] = (u_u_obs[3] + beta * U_u_obs[3] - Ccursive * e_u[3][3]) / Ncursive;
  var g = math.det(local_g_dd);
  var u_d = lower_index(X_u_obs, u_u_obs);
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      for (var k = 0; k < 4; k++) {
        for (var l = 0; l < 4; l++) {
	  //console.log(i,j,k,l)
	  e_u[i][2] = e_u[i][2] + (-1. / Math.sqrt(-g) * levciv[i][j][k][l] * U_d[j] * k_d[k] * u_d[l]) / (omega * Ncursive);
	}
      }
    }
  }
  return e_u;
}

function construct_U_vector(X_u_obs) {
  var local_g_uu = metric_uu(X_u_obs);
  var local_U_d = [-Math.sqrt(-1. / local_g_uu[0][0]), 0., 0., 0.];
  var local_U_u = raise_index(X_u_obs, local_U_d);
  return local_U_u;
}

function normalize_null(X_u_obs, k_u_obs) {
  var local_g_dd = metric_dd(X_u_obs);
  k_u_obs[0] = Math.sqrt((local_g_dd[1][1] * k_u_obs[1] * k_u_obs[1] + 
	                  local_g_dd[2][2] * k_u_obs[2] * k_u_obs[2] +
	                  local_g_dd[3][3] * k_u_obs[3] * k_u_obs[3]) / -local_g_dd[0][0]);
  return k_u_obs;
}

function inner_product(X_u_obs, A_u, B_u) {
  var local_g_dd = metric_dd(X_u_obs);
  return local_g_dd[0][0] * A_u[0] * B_u[0] +
	 local_g_dd[1][1] * A_u[1] * B_u[1] +
	 local_g_dd[2][2] * A_u[2] * B_u[2] +
	 local_g_dd[3][3] * A_u[3] * B_u[3];
}

function raise_index(X_u, V_d) {
  var local_g_uu = metric_uu(X_u);
  var V_u = [
	     local_g_uu[0][0] * V_d[0],
	     local_g_uu[1][1] * V_d[1],
	     local_g_uu[2][2] * V_d[2],
	     local_g_uu[3][3] * V_d[3]
            ];
  return V_u;
}

function lower_index(X_u, V_u) {
  var local_g_dd = metric_dd(X_u);
  var V_d = [
	     local_g_dd[0][0] * V_u[0],
	     local_g_dd[1][1] * V_u[1],
	     local_g_dd[2][2] * V_u[2],
	     local_g_dd[3][3] * V_u[3]
            ];
  return V_d;
}

// Metric_uu function: takes 4-position, spits out contravariant metric.
function metric_uu(X_u) {
  var g_uu = [
	      [0., 0., 0., 0.],
	      [0., 0., 0., 0.],
	      [0., 0., 0., 0.],
	      [0., 0., 0., 0.]
              ];

  var r     = X_u[1];
  var theta = X_u[2];
  var sint  = Math.sin(theta);
  var cost  = Math.cos(theta);
  var sigma = r * r;
  var delta = r * r - 2. * r;
  var A_    = r * r * r * r;

  g_uu[0][0] = -A_ / (sigma * delta);
  g_uu[1][1] = delta / sigma;
  g_uu[2][2] = 1. / sigma;
  g_uu[3][3] = 1. / (sigma * sint * sint);

  return g_uu;
}

// Metric_dd function: takes 4-position, spits out covariant metric.
function metric_dd(X_u) {
  var g_dd = [
	      [0., 0., 0., 0.],
	      [0., 0., 0., 0.],
	      [0., 0., 0., 0.],
	      [0., 0., 0., 0.]
              ];

  var r     = X_u[1];
  var theta = X_u[2];
  var sint  = Math.sin(theta);
  var cost  = Math.cos(theta);
  var sigma = r * r;
  var delta = r * r - 2. * r;
  var A_    = r * r * r * r;

  g_dd[0][0] = -sigma * delta / A_;
  g_dd[1][1] = sigma / delta;
  g_dd[2][2] = sigma;
  g_dd[3][3] = sigma * sint * sint;

  return g_dd;
}

// This function orthogonalizes v2 to v1 (v1 is left unmodified).
//function make_orthogonal(X_u_obs, v1_u, v2_u) {
//  var local_g_dd = metric_dd(X_u_obs);
//  var sub = inner_product(X_u_obs, v1_u, v2_u)
//}

function InitializeShader(gl, source_vs, source_frag)
{
    var shader_vs = gl.createShader(gl.VERTEX_SHADER);
    var shader_frag = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(shader_vs, source_vs);
    gl.shaderSource(shader_frag, source_frag);

    gl.compileShader(shader_vs);
    gl.compileShader(shader_frag);

    var error = false;
    var ErrorMessage;

    // Compile vertex shader
    if (!gl.getShaderParameter(shader_vs, gl.COMPILE_STATUS)) {
        ErrorMessage += gl.getShaderInfoLog(shader_vs);
        error = true;
    }

    // Compile fragment shader
    if (!gl.getShaderParameter(shader_frag, gl.COMPILE_STATUS)) {
        ErrorMessage += gl.getShaderInfoLog(shader_frag);
        error = true;
    }

    // Create shader program consisting of shader pair
    var program = gl.createProgram();

    var ret = gl.getProgramInfoLog(program);

    if (ret != "")
        ErrorMessage += ret;

    // Attach shaders to the program; these methods do not have a return value
    gl.attachShader(program, shader_vs);
    gl.attachShader(program, shader_frag);

    // Link the program - returns 0 if an error occurs
    if (gl.linkProgram(program) == 0) {
        ErrorMessage += "\r\ngl.linkProgram(program) failed with error code 0.";
        error = true;
    }
 
    if (error)  {
        console.log(ErrorMessage + ' ...failed to initialize shader.');
        return false;
    } else {
        console.log(ErrorMessage + ' ...shader successfully created.');
        return program; // Return created program
    }
}

function keydown(e) {
  var keyCode = e.keyCode;
  e.preventDefault();
  if (keyCode == 37) left_pressed  = true;
  if (keyCode == 39) right_pressed = true;
  if (keyCode == 38) up_pressed    = true;
  if (keyCode == 40) down_pressed  = true;
}

function checkInput() {
  //console.log("Checking input state!");
  if (left_pressed) {
    xes[sel] = xes[sel] - 1. * radiansPerPixel;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "xes");
    gl.uniform1fv(lc, xes);
    requestAnimationFrame(render);
  }
  if (right_pressed) {
    xes[sel] = xes[sel] + 1. * radiansPerPixel;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "xes");
    gl.uniform1fv(lc, xes);
    requestAnimationFrame(render);
  }
  if (up_pressed) {
    yes[sel] = yes[sel] + 1. * radiansPerPixel;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "yes");
    gl.uniform1fv(lc, yes);
    requestAnimationFrame(render);
  }
  if (down_pressed) {
    yes[sel] = yes[sel] - 1. * radiansPerPixel;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "yes");
    gl.uniform1fv(lc, yes);
    requestAnimationFrame(render);
  }
}

function keyup(e) {
  var keyCode = e.keyCode;
  if (keyCode == 37) left_pressed  = false;
  if (keyCode == 39) right_pressed = false;
  if (keyCode == 38) up_pressed    = false;
  if (keyCode == 40) down_pressed  = false;
}

function render() {
  now = Date.now();
  if (now - then > fpsInterval) {
    then = now;
    checkInput();
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  requestAnimationFrame(render);
}

function main() {
  console.log("Starting!");

  // Test area for GR functions.
  console.log("X_u_obs = ", X_u_obs);
  console.log("U_u_obs = ", U_u_obs);
  var inp = inner_product(X_u_obs, U_u_obs, U_u_obs);
  console.log("inner prod X and U is: ", inp);

  var k_u_obs = [0., -1., 0., 0.];
  console.log("initial k_u_obs = ", k_u_obs);
  k_u_obs = normalize_null(X_u_obs, k_u_obs);
  console.log("normalized k_u_obs = ", k_u_obs);

  console.log("k_u_obs inner product is: ", inner_product(X_u_obs, k_u_obs, k_u_obs));

  console.log("levciv is ", levciv);

  console.log("Constructing tetrad...");
  var tet = construct_tetrad_u(X_u_obs, U_u_obs, u_u_obs, k_u_obs);
  console.log("tetrad is ", tet);

  canvas = document.getElementById('canvas');
  width = canvas.width;
  height = canvas.height;

  console.log("Making camera vectors...");
  camvecs = makecamvecs(width, height, 30., 30.);
  console.log("Camvec 600 300 is: ", camvecs[600][300]);

  fps = 90.;
  fpsInterval = 1000 / fps;

  // Add key press event listener
  document.body.addEventListener("keydown", keydown, false);
  document.body.addEventListener("keyup", keyup, false);

  // Get A WebGL context
  var canvas = document.getElementById("canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // setup GLSL program
  var vertsource = document.getElementById("2d-vertex-shader").text;
  var fragsource = document.getElementById("2d-fragment-shader").text;

  program = InitializeShader(gl, vertsource, fragsource);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var colorLocation = gl.getAttribLocation(program, "a_color");

  // Look up locations of other variables
  // Make sure that we are using the right program first.
  gl.useProgram(program);

  // The line below is how we ask the shader to give us the location in memory where a
  // 'uniform' type variable is stored in the shader code. Once we have this location,
  // we can write data into it.
  lc = gl.getUniformLocation(program, "resolution");
  gl.uniform2f(lc, width, height);

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");

  // Create a buffer for the positions.
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Set Geometry: we define a 'quad' (two triangles) to draw to the canvas.
  // The actual colours of these triangles will not be displayed, because our
  // fragment shader will overwrite all of it. But the geometry needs to be there,
  // otherwise we will end up seeing nothing.
  setGeometry(gl);

  // Create a buffer for the colors.
  var colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // Set the colors. This does not really matter, but we leave it in for completeness' sake.
  setColors(gl);

  var translation = [0, 0];
  var angleInRadians = 0;
  var scale = [1, 1];

  drawScene();

  then = Date.now();
  requestAnimationFrame(render);

  // Draw the scene. This function only gets called once: to put the triangles on the canvas. All updates after this
  // will only update the colours of the pixels. The same two triangles simply stay on the canvas.
  function drawScene() {

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(0.0, 0.5, 0.0, 1.0);

    // Clear the canvas.
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Turn on the position attribute
    gl.enableVertexAttribArray(positionLocation);

    // Bind the position buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLocation, size, type, normalize, stride, offset);

    // Turn on the color attribute
    gl.enableVertexAttribArray(colorLocation);

    // Bind the color buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

    // Tell the color attribute how to get data out of colorBuffer (ARRAY_BUFFER)
    var size = 4;          // 4 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        colorLocation, size, type, normalize, stride, offset);

    /*
    // Compute the matrix
    var matrix = m3.projection(gl.canvas.clientWidth, gl.canvas.clientHeight);
    matrix = m3.translate(matrix, translation[0], translation[1]);
    matrix = m3.rotate(matrix, angleInRadians);
    matrix = m3.scale(matrix, scale[0], scale[1]);
    */

    var matrix = [
		1, 0, 0,
		0, 1, 0,
		0, 0, 1
	];

    // Set the matrix.
    gl.uniformMatrix3fv(matrixLocation, false, matrix);

    // Draw the geometry.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);
  }
}

// Fill the buffer with the values that define a rectangle.
// Note, will put the values in whatever buffer is currently
// bound to the ARRAY_BUFFER bind point
function setGeometry(gl) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
          -1, -1,
          1, -1,
          -1, 1,
          1, -1,
          -1, 1,
          1, 1]),
      gl.STATIC_DRAW);
}

// Fill the buffer with colors for the 2 triangles
// that make the rectangle.
// Note, will put the values in whatever buffer is currently
// bound to the ARRAY_BUFFER bind point
function setColors(gl) {
  // Pick 2 random colors.
  var r1 = Math.random();
  var b1 = Math.random();
  var g1 = Math.random();
  var r2 = Math.random();
  var b2 = Math.random();
  var g2 = Math.random();

  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(
        [ r1, b1, g1, 1,
          r1, b1, g1, 1,
          r1, b1, g1, 1,
          r2, b2, g2, 1,
          r2, b2, g2, 1,
          r2, b2, g2, 1]),
      gl.STATIC_DRAW);
}

main();

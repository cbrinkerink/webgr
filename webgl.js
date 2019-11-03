"use strict";

// Variable that holds the locations of variables in the shader for us
var lc;

var currentLoc = new Float32Array([20.,50.,90.,130.,170.,200.,220.,270.,290.,330.]);
var gl;
var program;
var fps, fpsInterval, now, then;

var canvas;
var width;
var height;

var lambdasPerPixel = 5e8;
var radiansPerPixel = 1e-6 * 1./3600. * Math.PI/180.;
var windowSize = 600;

// We leave out left/right bracket, u&i, and o&p
// as those should operate more in discrete steps for now.
var up_pressed = false;
var down_pressed = false;
var left_pressed = false;
var right_pressed = false;
var w_pressed = false;
var s_pressed = false;
var a_pressed = false;
var d_pressed = false;
var z_pressed = false;
var x_pressed = false;
var c_pressed = false;
var v_pressed = false;
var comma_pressed = false;
var period_pressed = false;
var minus_pressed = false;
var equals_pressed = false;
var zero_pressed = false;

var lambdasPerPixel = 5e8;
var radiansPerPixel = 1e-6 * 1./3600. * Math.PI/180.;

var sourcetypes = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0
];

var xes = [
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel
  0.,0.,0.,0.,0.,0.,0.,0.,0.,0.
];

var yes = [
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel, 
//  (Math.random() * 40. - 20.) * radiansPerPixel
  0.,0.,0.,0.,0.,0.,0.,0.,0.,0.
];

var xsigmas = [
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel
];

var ysigmas = [
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel, 
//  (Math.random() * 100. + 10.) * radiansPerPixel
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel,
  50. * radiansPerPixel
];

var thetas = [
//  Math.random() * Math.PI, 
//  Math.random() * Math.PI, 
//  Math.random() * Math.PI, 
//  Math.random() * Math.PI, 
//  Math.random() * Math.PI, 
//  Math.random() * Math.PI, 
//  Math.random() * Math.PI, 
//  Math.random() * Math.PI, 
//  Math.random() * Math.PI, 
//  Math.random() * Math.PI
  0.,0.,0.,0.,0.,0.,0.,0.,0.,0.
];

var strengths = [
//  Math.random() * 0.5 + 0.1, 
//  Math.random() * 0.5 + 0.1, 
//  Math.random() * 0.5 + 0.1, 
//  Math.random() * 0.5 + 0.1, 
//  Math.random() * 0.5 + 0.1, 
//  Math.random() * 0.5 + 0.1, 
//  Math.random() * 0.5 + 0.1, 
//  Math.random() * 0.5 + 0.1, 
//  Math.random() * 0.5 + 0.1, 
//  Math.random() * 0.5 + 0.1
  1.,0.,0.,0.,0.,0.,0.,0.,0.,0.
];

var uvs = [
  1e7, 1e7,
  5e7, 5e7,
  1e8, 1e8,
  5e8, 5e8,
  1e9, 1e9,
  5e9, 5e9,
  1e10, 1e10,
  5e10, 5e10,
  1e11, 1e11,
  5e11, 5e11
];

var scale;
var fourierstrength = 6e18;
var imagestrength = 1.;
var sel = 0;

var redBalance = 0.6;
var greenBalance = 0.6;
var blueBalance = 0.6;

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
  if (e.key == 'w') w_pressed      = true;
  if (e.key == 'a') a_pressed      = true;
  if (e.key == 's') s_pressed      = true;
  if (e.key == 'd') d_pressed      = true;
  if (e.key == 'z') z_pressed      = true;
  if (e.key == 'x') x_pressed      = true;
  if (e.key == 'c') c_pressed      = true;
  if (e.key == 'v') v_pressed      = true;
  if (e.key == ',') comma_pressed  = true;
  if (e.key == '.') period_pressed = true;
  if (e.key == '-') minus_pressed  = true;
  if (e.key == '=') equals_pressed = true;
  if (e.key == 'q') {
    sourcetypes[sel] = 1 - sourcetypes[sel];
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "sourcetypes");
    gl.uniform1iv(lc, sourcetypes);
    requestAnimationFrame(render);
  }
  if (e.key == 'm') {
    xes[sel] = 0.;
    yes[sel] = 0.;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "xes");
    gl.uniform1fv(lc, xes);
    lc = gl.getUniformLocation(program, "yes");
    gl.uniform1fv(lc, yes);
    requestAnimationFrame(render);
  }
  if (e.key == 'n') {
    strengths[sel] = 1.;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "strengths");
    gl.uniform1fv(lc, strengths);
    requestAnimationFrame(render);
  }
  if (e.key == 'b') {
    xsigmas[sel] = 50. * radiansPerPixel;
    ysigmas[sel] = 50. * radiansPerPixel;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "xsigmas");
    gl.uniform1fv(lc, xsigmas);
    lc = gl.getUniformLocation(program, "ysigmas");
    gl.uniform1fv(lc, ysigmas);
    requestAnimationFrame(render);
  }
  if (e.key == 'r') {
    redBalance = redBalance + 0.1;
    if (redBalance > 1.) redBalance = 1.;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "redBalance");
    gl.uniform1f(lc, redBalance);
  }
  if (e.key == 'f') {
    redBalance = redBalance - 0.1;
    if (redBalance < 0.5) redBalance = 0.5;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "redBalance");
    gl.uniform1f(lc, redBalance);
  }
  if (e.key == 't') {
    greenBalance = greenBalance + 0.1;
    if (greenBalance > 1.) greenBalance = 1.;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "greenBalance");
    gl.uniform1f(lc, greenBalance);
  }
  if (e.key == 'g') {
    greenBalance = greenBalance - 0.1;
    if (greenBalance < 0.5) greenBalance = 0.5;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "greenBalance");
    gl.uniform1f(lc, greenBalance);
  }
  if (e.key == 'y') {
    blueBalance = blueBalance + 0.1;
    if (blueBalance > 1.) blueBalance = 1.;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "blueBalance");
    gl.uniform1f(lc, blueBalance);
  }
  if (e.key == 'h') {
    blueBalance = blueBalance - 0.1;
    if (blueBalance < 0.5) blueBalance = 0.5;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "blueBalance");
    gl.uniform1f(lc, blueBalance);
  }
  if (e.key == 'u') {
    radiansPerPixel = radiansPerPixel/1.5;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "rpp");
    gl.uniform1f(lc, radiansPerPixel);
  }
  if (e.key == 'i') {
    radiansPerPixel = radiansPerPixel*1.5;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "rpp");
    gl.uniform1f(lc, radiansPerPixel);
  }
  if (e.key == 'o') {
    lambdasPerPixel = lambdasPerPixel/1.5;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "lpp");
    gl.uniform1f(lc, lambdasPerPixel);
  }
  if (e.key == 'p') {
    lambdasPerPixel = lambdasPerPixel*1.5;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "lpp");
    gl.uniform1f(lc, lambdasPerPixel);
  }
  if (e.key == '0') {
    strengths[sel] = 0.;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "strengths");
    gl.uniform1fv(lc, strengths);
    requestAnimationFrame(render);
  }
  if (e.key == '[') {
    sel = sel - 1;
    if (sel < 0) sel = 9;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "sel");
    gl.uniform1i(lc, sel);
    requestAnimationFrame(render);
  }
  if (e.key == ']') {
    sel = sel + 1;
    if (sel > 9) sel = 0;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "sel");
    gl.uniform1i(lc, sel);
    requestAnimationFrame(render);
  }
  if (e.key == 'k') {
    // Resize the canvas element
    width = document.getElementById("canvas").width;
    height = document.getElementById("canvas").height;
    if (width > 100) {
      document.getElementById("canvas").width = width - 100;
      document.getElementById("canvas").height = height - 50;
      gl.viewport(0, 0, width-100, height-50);
      gl.useProgram(program);
      lc = gl.getUniformLocation(program, "resolution");
      gl.uniform2f(lc, width-100, height-50);
      scale = width/2.;
      lc = gl.getUniformLocation(program, "scale");
      gl.uniform1f(lc, scale);
      radiansPerPixel = radiansPerPixel * width/(width-100);
      lambdasPerPixel = lambdasPerPixel * width/(width-100);
      lc = gl.getUniformLocation(program, "rpp");
      gl.uniform1f(lc, radiansPerPixel);
      lc = gl.getUniformLocation(program, "lpp");
      gl.uniform1f(lc, lambdasPerPixel);
      requestAnimationFrame(render);
    }
    console.log("Actual canvas width = ", document.getElementById("canvas").width);
    console.log("drawingBufferWidth = ", gl.drawingBufferWidth);
    console.log("window.innerWidth = ", window.innerWidth);
    console.log("gl.canvas.clientWidth = ", gl.canvas.clientWidth);
    console.log("gl.canvas.width = ", gl.canvas.width);
  }
  if (e.key == 'l') {
    // Resize the canvas element
    width = document.getElementById("canvas").width;
    height = document.getElementById("canvas").height;
    document.getElementById("canvas").width = width + 100;
    document.getElementById("canvas").height = height + 50;
      gl.viewport(0, 0, width+100, height+50);
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "resolution");
    gl.uniform2f(lc, width+100, height+50);
    scale = width/2.;
    lc = gl.getUniformLocation(program, "scale");
    gl.uniform1f(lc, scale);
    radiansPerPixel = radiansPerPixel * width/(width+100);
    lambdasPerPixel = lambdasPerPixel * width/(width+100);
    lc = gl.getUniformLocation(program, "rpp");
    gl.uniform1f(lc, radiansPerPixel);
    lc = gl.getUniformLocation(program, "lpp");
    gl.uniform1f(lc, lambdasPerPixel);
    requestAnimationFrame(render);
    console.log("Actual canvas width = ", document.getElementById("canvas").width);
    console.log("drawingBufferWidth = ", gl.drawingBufferWidth);
    console.log("window.innerWidth = ", window.innerWidth);
    console.log("gl.canvas.clientWidth = ", gl.canvas.clientWidth);
    console.log("gl.canvas.width = ", gl.canvas.width);
  }
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
  if (w_pressed) {
    ysigmas[sel] = ysigmas[sel] + 1. * radiansPerPixel;
    if (ysigmas[sel] > windowSize * radiansPerPixel) ysigmas[sel] = windowSize * radiansPerPixel;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "ysigmas");
    gl.uniform1fv(lc, ysigmas);
    requestAnimationFrame(render);    
  }
  if (s_pressed) {
    ysigmas[sel] = ysigmas[sel] - 1. * radiansPerPixel;
    if (ysigmas[sel] < 1. * radiansPerPixel) ysigmas[sel] = 1. * radiansPerPixel;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "ysigmas");
    gl.uniform1fv(lc, ysigmas);
    requestAnimationFrame(render);    
  }
  if (d_pressed) {
    xsigmas[sel] = xsigmas[sel] + 1. * radiansPerPixel;
    if (xsigmas[sel] > windowSize * radiansPerPixel) xsigmas[sel] = windowSize * radiansPerPixel;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "xsigmas");
    gl.uniform1fv(lc, xsigmas);
    requestAnimationFrame(render);    
  }
  if (a_pressed) {
    xsigmas[sel] = xsigmas[sel] - 1. * radiansPerPixel;
    if (xsigmas[sel] < 1. * radiansPerPixel) xsigmas[sel] = 1. * radiansPerPixel;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "xsigmas");
    gl.uniform1fv(lc, xsigmas);
    requestAnimationFrame(render);    
  }
  if (comma_pressed) {
    thetas[sel] = thetas[sel] - 0.01 * Math.PI;
    if (thetas[sel] < 0.) thetas[sel] = thetas[sel] + Math.PI;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "thetas");
    gl.uniform1fv(lc, thetas);
    requestAnimationFrame(render); 
  }
  if (period_pressed) {
    thetas[sel] = thetas[sel] + 0.01 * Math.PI;
    if (thetas[sel] > Math.PI) thetas[sel] = thetas[sel] - Math.PI;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "thetas");
    gl.uniform1fv(lc, thetas);
    requestAnimationFrame(render); 
  }
  if (z_pressed) {
    strengths[sel] = strengths[sel] - 0.01;
    if (strengths[sel] < -5.) strengths[sel] = -5.;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "strengths");
    gl.uniform1fv(lc, strengths);
    requestAnimationFrame(render);
  }
  if (x_pressed) {
    strengths[sel] = strengths[sel] + 0.01;
    if (strengths[sel] > 5.) strengths[sel] = 5.;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "strengths");
    gl.uniform1fv(lc, strengths);
    requestAnimationFrame(render);
  }
  if (c_pressed) {
    imagestrength = imagestrength/1.1;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "imagestrength");
    gl.uniform1f(lc, imagestrength);
    requestAnimationFrame(render);
  }
  if (v_pressed) {
    imagestrength = imagestrength*1.1;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "imagestrength");
    gl.uniform1f(lc, imagestrength);
    requestAnimationFrame(render);
  }
  if (minus_pressed) {
    fourierstrength = fourierstrength/1.1;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "fourierstrength");
    gl.uniform1f(lc, fourierstrength);
    requestAnimationFrame(render);
  }
  if (equals_pressed) {
    fourierstrength = fourierstrength*1.1;
    gl.useProgram(program);
    lc = gl.getUniformLocation(program, "fourierstrength");
    gl.uniform1f(lc, fourierstrength);
    requestAnimationFrame(render);
  }
}

function keyup(e) {
  var keyCode = e.keyCode;
  if (keyCode == 37) left_pressed  = false;
  if (keyCode == 39) right_pressed = false;
  if (keyCode == 38) up_pressed    = false;
  if (keyCode == 40) down_pressed  = false;
  if (e.key == 'w') w_pressed      = false;
  if (e.key == 'a') a_pressed      = false;
  if (e.key == 's') s_pressed      = false;
  if (e.key == 'd') d_pressed      = false;
  if (e.key == 'z') z_pressed      = false;
  if (e.key == 'x') x_pressed      = false;
  if (e.key == 'c') c_pressed      = false;
  if (e.key == 'v') v_pressed      = false;
  if (e.key == ',') comma_pressed  = false;
  if (e.key == '.') period_pressed = false;
  if (e.key == '-') minus_pressed  = false;
  if (e.key == '=') equals_pressed = false;
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
  canvas = document.getElementById('canvas');
  width = canvas.width;
  height = canvas.height;

  scale = width / 2.;

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

  lc = gl.getUniformLocation(program, "resolution");
  gl.uniform2f(lc, width, height);

  lc = gl.getUniformLocation(program, "sourcetypes");
  gl.uniform1iv(lc, sourcetypes);

  lc = gl.getUniformLocation(program, "xes");
  gl.uniform1fv(lc, xes);

  lc = gl.getUniformLocation(program, "yes");
  gl.uniform1fv(lc, yes);

  lc = gl.getUniformLocation(program, "xsigmas");
  gl.uniform1fv(lc, xsigmas);

  lc = gl.getUniformLocation(program, "ysigmas");
  gl.uniform1fv(lc, ysigmas);

  lc = gl.getUniformLocation(program, "thetas");
  gl.uniform1fv(lc, thetas);

  lc = gl.getUniformLocation(program, "strengths");
  gl.uniform1fv(lc, strengths);

  lc = gl.getUniformLocation(program, "scale");
  gl.uniform1f(lc, scale);

  lc = gl.getUniformLocation(program, "fourierstrength");
  gl.uniform1f(lc, fourierstrength);

  lc = gl.getUniformLocation(program, "imagestrength");
  gl.uniform1f(lc, imagestrength);

  lc = gl.getUniformLocation(program, "rpp");
  gl.uniform1f(lc, radiansPerPixel);

  lc = gl.getUniformLocation(program, "lpp");
  gl.uniform1f(lc, lambdasPerPixel);

  lc = gl.getUniformLocation(program, "sel");
  gl.uniform1i(lc, sel);

  lc = gl.getUniformLocation(program, "redBalance");
  gl.uniform1f(lc, redBalance);

  lc = gl.getUniformLocation(program, "greenBalance");
  gl.uniform1f(lc, greenBalance);

  lc = gl.getUniformLocation(program, "blueBalance");
  gl.uniform1f(lc, blueBalance);

  lc = gl.getUniformLocation(program, "uvpoints");
  gl.uniform1fv(lc, uvs);

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");

  // Create a buffer for the positions.
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Set Geometry.
  setGeometry(gl);

  // Create a buffer for the colors.
  var colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // Set the colors.
  setColors(gl);

  var translation = [0, 0];
  var angleInRadians = 0;
  var scale = [1, 1];

  drawScene();

  then = Date.now();
  requestAnimationFrame(render);

  // Draw the scene.
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

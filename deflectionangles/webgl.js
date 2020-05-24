"use strict";

/* Dressed-down version of visibilities page + shader.
 * We aim to calculate a new defleciton angle map by having our shader do the integration for all required r and alpha values.
 */

// Variable that holds the locations of variables in the shader for us
var lc;

var gl;
var program, calcprogram;
var fps, fpsInterval, now, then, currentcounter;

var rendering = true;

var keyMode = 0;

var canvas, textcanvas, ctx;
var width;
var height;

var criticalalphasTexture, deflectionsTexture;
var calcFrameBuffer;

var windowSize = 2048;

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

function render() {
  now = Date.now();
  setTimeout(function(){
  if (now - then > fpsInterval) {
    currentcounter = currentcounter + (now - then);
    then = now;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = "10px Arial";
    ctx.fillStyle = "white";
    //ctx.fillText("FOV: " + (radiansPerPixel * height * 180./Math.PI * 3600. * 1e6).toFixed(2).toString() + " muas", 10, height - 10);
    //ctx.fillText("Max u/v: " + (lambdasPerPixel * height).toFixed(2).toString() + " wavelengths", height + 10, height - 10);
    //ctx.fillText("Sky image", 10, 20);
    //ctx.fillText("Visibility map", height + 10, 20);
    // Plot our uv points here too!

    // Set time in shader to now
    if (rendering) {
      lc = gl.getUniformLocation(program, "time");
      gl.uniform1f(lc, currentcounter);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  requestAnimationFrame(render);
  }, fpsInterval);
}

function createDataTexture(gl, dataarray, sizex, sizey) {
    // Note that we expect dataarray to have float32 values in it, and be a product of powers of two in size.
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, sizex, sizey, 0, gl.RGBA, gl.FLOAT, dataarray);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function createOutputTexture(gl, sizex, sizey) {
    // Note that we expect dataarray to have float32 values in it, and be a product of powers of two in size.
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, sizex, sizey, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

// Draw the scene.
function drawScene(glProgram) {

  gl.useProgram(glProgram);

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

  //////////////////
  // Upload texture coordinates to shader
  // create the texcoord buffer, make it the current ARRAY_BUFFER
  // and copy in the texcoord values
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  setTexcoords(gl); 
  //////////////////

  var texcoordAttributeLocation = gl.getAttribLocation(glProgram, "a_texcoord");
  
  console.log("texcoordAttributeLocation: ", texcoordAttributeLocation);

  // Turn on the attribute
  gl.enableVertexAttribArray(texcoordAttributeLocation);

  // Old spot for texcoordbuffer initialization

  if (glProgram == calcprogram) {
    // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floating point values
    var normalize = false; // convert from 0-255 to 0.0-1.0
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next color
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(texcoordAttributeLocation, size, type, normalize, stride, offset);

    // Test area for uploading float32 textures to GPU
    var da = new Float32Array([
	    0.,  1.,  2.,  3.,  4.,  5.,  6.,  7.,  8.,  9.,
	    10.,  11.,  12.,  13.,  14.,  15.,  16.,  17.,  18.,  19.,
	    20.,  21.,  22.,  23.,  24.,  25.,  26.,  27.,  28.,  29.,
	    30.,  31.,  32.,  33.,  34.,  35.,  36.,  37.,  38.,  39.,
	    40.,  41.,  42.,  43.,  44.,  45.,  46.,  47.,  48.,  49.,
	    50.,  51.,  52.,  53.,  54.,  55.,  56.,  57.,  58.,  59.,
	    60.,  61.,  62.,  63.,  64.,  65.,  66.,  67.,  68.,  69.,
	    70.,  71.,  72.,  73.,  74.,  75.,  76.,  77.,  78.,  79.,
	    80.,  81.,  82.,  83.,  84.,  85.,  86.,  87.,  88.,  89.,
	    90.,  91.,  92.,  93.,  94.,  95.,  96.,  97.,  98.,  99.,
	    100.,  101.,  102.,  103.,  104.,  105.,  106.,  107.,  108.,  109.,
	    110.,  111.,  112.,  113.,  114.,  115.,  116.,  117.,  118.,  119.,
	    120.,  121.,  122.,  123.,  124.,  125.,  126.,  127.,  128.,  129.,
	    130.,  131.,  132.,  133.,  134.,  135.,  136.,  137.,  138.,  139.,
	    140.,  141.,  142.,  143.,  144.,  145.,  146.,  147.,  148.,  149.,
	    150.,  151.,  152.,  153.,  154.,  155.,  156.,  157.,  158.,  159.
    ]);

    // ########### WARNING : THIS IS A DIRTY WORKAROUND!!! ######################
    // # We PRE_INITIALIZE THE TEXTURES TO BE 4000 PIXELS TALL BECAUSE CHANGING #
    // # THEIR SIZE LATER IS PROVING TO BE TROUBLESOME.

    criticalalphasTexture = createDataTexture(gl, da, 1, 40);
    deflectionsTexture = createOutputTexture(gl, 2048, 2048);

    // ##########################################################################
    // ##########################################################################
    // ##########################################################################

    var u_alphaLocation = gl.getUniformLocation(glProgram, "criticalalphas");
    var u_deflectionLocation = gl.getUniformLocation(glProgram, "deflections");
 
    // set which texture units to render with.
    gl.uniform1i(u_alphaLocation, 0);  // texture unit 0
    gl.uniform1i(u_deflectionLocation, 1);  // texture unit 1

    // Create and bind the framebuffer
    calcFrameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, calcFrameBuffer);
 
    // attach the texture as the first color attachment
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, deflectionsTexture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(glProgram, "a_position");
  var colorLocation = gl.getAttribLocation(glProgram, "a_color");

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0.0, 0.5, 0.0, 1.0);

  // Clear the canvas.
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Tell it to use our program (pair of shaders)
  //gl.useProgram(program);

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
  gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);

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

  var matrix = [
      	1, 0, 0,
      	0, 1, 0,
      	0, 0, 1
      ];

  // lookup uniforms
  var matrixLocation = gl.getUniformLocation(glProgram, "u_matrix");

  // Set the matrix.
  gl.uniformMatrix3fv(matrixLocation, false, matrix);

  // Draw the geometry.
  var primitiveType = gl.TRIANGLES;
  var offset = 0;
  var count = 6;
  gl.drawArrays(primitiveType, offset, count);
}

function setUniforms(glprog) {
  // Look up locations of other variables
  // Make sure that we are using the right program first.
  gl.useProgram(glprog);

  //lc = gl.getUniformLocation(glprog, "strengths");
  //gl.uniform1fv(lc, strengths);
}

function calcVisibilities(gl, texArray, xlen, ylen) {
  console.log("Switching to calc shader...");
  gl.useProgram(calcprogram);
  // Update all uniforms for the compute shader

  //createDataTexture(gl, texArray, xlen, ylen);
  //createOutputTexture(gl, xlen, ylen);

  var u_alphaLocation = gl.getUniformLocation(calcprogram, "criticalalphas");
  var u_deflectionLocation = gl.getUniformLocation(calcprogram, "deflections");
 
  // set which texture units to render with.
  gl.uniform1i(u_alphaLocation, 0);  // texture unit 0
  gl.uniform1i(u_deflectionLocation, 1);  // texture unit 1

  // bind our calc framebuffer to rendering output so we render to texture (don't forget to use gl.viewport!)
  console.log("Switching to framebuffer...");

  calcFrameBuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, calcFrameBuffer);
  gl.viewport(0, 0, xlen, ylen);
 
  // attach the texture as the first color attachment
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, deflectionsTexture, 0);
  // - Make sure that at least one render pass is performed: use gl.Clear, gl.drawArrays/gl.drawElements
  console.log("Rendering to texture...");
  gl.clearColor(0, 0, 1, 1);   // clear to blue
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // - Retrieve output texture from GPU
  var ph = new Float32Array(4 * xlen * ylen);
  gl.readPixels(0, 0, xlen, ylen, gl.RGBA, gl.FLOAT, ph, 0);
  console.log("Retrieved texture data:");
  console.log(ph);

  console.log("Switching back to screenbuffer...");
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  console.log("Switching back to draw shader...");
  gl.useProgram(program);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  var c = document.getElementById("canvas2");
  var ctx = c.getContext("2d");
  var imgData = ctx.createImageData(2048, 2048);
  var i;
  for (i = 0; i < imgData.data.length; i += 4) {
    imgData.data[i+0] = Math.floor(255. * ph[i+2] / (2. * Math.PI));
    imgData.data[i+1] = 0;
    imgData.data[i+2] = Math.floor(255. * ph[i+3]);
    imgData.data[i+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  // Test area for putting the deflection angle map into a binary blob for download
  // and later use in the webGR app.
  var fa = new Float32Array(2048 * 2048);
  for (i = 0; i < ph.length; i += 4) {
    fa[i/4] = ph[i+2];
  }
  var blob = new Blob([fa.buffer], {type: 'application/octet-stream'});
  var blobURL = URL.createObjectURL(blob);
  document.getElementById("link").innerHTML = "<a href=" + blobURL + ">" + "Download deflection angle map</a>";
}

function main() {

  console.log("Starting!");
  canvas = document.getElementById('canvas');
  width = canvas.width;
  height = canvas.height;

  fps = 90.;
  fpsInterval = 1000 / fps;

  currentcounter = 0.;

  // Get A WebGL context. We need webgl2!
  gl = canvas.getContext("webgl2");
  if (!gl) {
    console.log("Webgl2 is not supported for this OS/browser combination! :(");
    return;
  }

  // This extension is needed to read float32 textures back from the GPU with gl.readPixels().
  const ext = gl.getExtension("EXT_color_buffer_float");
  if (!ext) {
    console.log("need EXT_color_buffer_float extension :(");
    return;
  }

  // setup GLSL program
  var vertsource = document.getElementById("2d-vertex-shader").text;
  var fragsource = document.getElementById("2d-fragment-shader").text;
  var vertcalcsource = document.getElementById("2d-vertex-calc").text;
  var viscalcsource = document.getElementById("2d-vis-calc").text;

  program = InitializeShader(gl, vertsource, fragsource);
  calcprogram = InitializeShader(gl, vertcalcsource, viscalcsource);

  // Set the common uniforms that both shaders share
  setUniforms(program);
  setUniforms(calcprogram);

  // From here on, set uniforms that are only used by the draw shader
  gl.useProgram(program);

  // Set resolution for calc texture separately!
  gl.useProgram(calcprogram);
  lc = gl.getUniformLocation(calcprogram, "resolution");
  gl.uniform2f(lc, 2048., 2048.);

  console.log("Drawing scene for calc");
  drawScene(calcprogram);
  var texArray = new Float32Array(4 * 2048 * 2048);
  calcVisibilities(gl, texArray, 2048, 2048);
  console.log("Drawing scene for render");
  drawScene(program);
  console.log("Drawing scene for render again");
  //gl.useProgram(program);
  drawScene(program);

  //then = Date.now();
  //requestAnimationFrame(render);
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

// Fill the buffer with texture coordinates for the F.
function setTexcoords(gl) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        // left column front
        -1, -1,
        -1, 1,
        1, -1,
        -1, 1,
        1, -1,
        1, 1,
       ]),
       gl.STATIC_DRAW);
}

main();

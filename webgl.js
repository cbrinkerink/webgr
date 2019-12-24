"use strict";

// Variable that holds the locations of variables in the shader for us
var lc;

var gl;
var program;
var fps, fpsInterval, now, then;

var alpha_corr = 1.;

var canvas, textcanvas, ctx;
var width;
var height;

var up_pressed = false;
var down_pressed = false;
var left_pressed = false;
var right_pressed = false;
var z_pressed = false;
var x_pressed = false;
var leftbracket_pressed = false;
var rightbracket_pressed = false;
var minus_pressed = false;
var equals_pressed = false;
var q_pressed = false;
var w_pressed = false;
var e_pressed = false;
var s_pressed = false;
var d_pressed = false;
var a_pressed = false;

var pointerLock = false;

// Define observer variables:
var lookdir_cart  = [-1., 0., 0.];
var updir_cart    = [0., 0., 1.];
var obs_pos_cart  = [99., 0., 0.];

var X_u_obs = [0., 99., Math.PI/2., 0.]; // To add: express X_u_obs in terms of obs_pos_cart
var U_u_obs = construct_U_vector(X_u_obs); // 4-velocity of observer
var u_u_obs = [0., 0., -0.01, 0.]; // To add: express u_u_obs in terms of updir_cart
var k_u_obs = [0., -1., 0., 0.]; // look direction
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

var deflectionmap = new Float32Array(256 * 256);

parseFloat()

// This function populates the camera vectors in the local tetrad frame.
function makecamvecs(xpix, ypix, fovx, fovy) {
  var cv = new Array(xpix * ypix * 4);
  //var cv = new Array(xpix);
  for (var i = 0; i < xpix; i++) {
    //cv[i] = new Array(ypix);
    for (var j = 0; j < ypix; j++) {
      //cv[i][j] = new Array(4);
      var stepx = fovx / xpix;
      var stepy = fovy / ypix;
      var alpha = -fovx * 0.5 + (i + 0.5) * stepx;
      var beta  = -fovy * 0.5 + (j + 0.5) * stepy;
      var plane_dist = 30.;
      var norm = Math.sqrt(alpha * alpha + beta * beta + plane_dist * plane_dist);
      var ux = alpha / norm;
      var uy = beta / norm;
      var uz = plane_dist / norm;
      cv[(i + j * xpix) * 4 + 0] = 1.;
      cv[(i + j * xpix) * 4 + 1] = ux;
      cv[(i + j * xpix) * 4 + 2] = uy;
      cv[(i + j * xpix) * 4 + 3] = uz;
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


  // Initialize the tetrad to all zeroes
  var e_u = [
	     [0., 0., 0., 0.],
	     [0., 0., 0., 0.],
	     [0., 0., 0., 0.],
	     [0., 0., 0., 0.]
             ];
  // Use the 4-velocity of the observer for the time component
  e_u[0][0] = U_u_obs[0];
  e_u[1][0] = U_u_obs[1];
  e_u[2][0] = U_u_obs[2];
  e_u[3][0] = U_u_obs[3];
  // Make the look direction perpendicular to the time component
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
  // Use u_u_obs to generate a component perpendicular to the look direction (right-pointing).
  e_u[0][1] = (u_u_obs[0] + beta * U_u_obs[0] - Ccursive * e_u[0][3]) / Ncursive;
  e_u[1][1] = (u_u_obs[1] + beta * U_u_obs[1] - Ccursive * e_u[1][3]) / Ncursive;
  e_u[2][1] = (u_u_obs[2] + beta * U_u_obs[2] - Ccursive * e_u[2][3]) / Ncursive;
  e_u[3][1] = (u_u_obs[3] + beta * U_u_obs[3] - Ccursive * e_u[3][3]) / Ncursive;
  //var g = math.det(local_g_dd);
  var g = local_g_dd[0][0] * local_g_dd[1][1] * local_g_dd[2][2] * local_g_dd[3][3]; // because diagonal matrix :p
  var u_d = lower_index(X_u_obs, u_u_obs);
  // Construct the last perpendicular component (should be the up direction).
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      for (var k = 0; k < 4; k++) {
        for (var l = 0; l < 4; l++) {
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
  if (e.key == 'z') z_pressed = true;
  if (e.key == 'x') x_pressed = true;
  if (e.key == ']') rightbracket_pressed = true;
  if (e.key == '[') leftbracket_pressed = true;
  if (e.key == '-') minus_pressed = true;
  if (e.key == '=') equals_pressed = true;
  if (e.key == 'q') q_pressed = true;
  if (e.key == 'a') a_pressed = true;
  if (e.key == 'w') w_pressed = true;
  if (e.key == 's') s_pressed = true;
  if (e.key == 'd') d_pressed = true;
  if (e.key == 'e') e_pressed = true;

}


function checkInput() {

  // Determine in which direction(s) to move	
  var forwardback = 0.;
  var leftright = 0.;
  var updown = 0.;

  var speedfactor = -.1;

  if (left_pressed || a_pressed) {
    // Move the cartesian observer position laterally left by a small amount
    leftright = -1.;  
  }
  if (right_pressed || d_pressed) {
    // Move the cartesian observer position laterally right by a small amount
    leftright = 1.;
  }
  if (up_pressed || w_pressed) {
    // Move the cartesian observer position in the look direction by a small amount
    forwardback = -1.;
  }
  if (down_pressed || s_pressed) {
    // Move the cartesian observer position against the look direction by a small amount
    forwardback = 1.;
  }
  if (z_pressed || q_pressed) {
    // Move the cartesian observer position in the up direction by a small amount
    updown = 1.;
  }
  if (x_pressed || e_pressed) {
    // Move the cartesian observer position against the up direction by a small amount
    updown = -1.;
  }

  // Update observer variables:
  // Leftright
  obs_pos_cart = add(obs_pos_cart, mult(normalize(cross(updir_cart, lookdir_cart)), leftright * speedfactor));
  // Forwardback
  obs_pos_cart = add(obs_pos_cart, mult(lookdir_cart, forwardback * speedfactor));
  // Updown
  obs_pos_cart = add(obs_pos_cart, mult(updir_cart, updown * speedfactor));

  var rad = Math.sqrt(obs_pos_cart[0] * obs_pos_cart[0] + obs_pos_cart[1] * obs_pos_cart[1] + obs_pos_cart[2] * obs_pos_cart[2]);
  X_u_obs = [0., rad, Math.acos(obs_pos_cart[2] / rad), Math.atan2(obs_pos_cart[1],obs_pos_cart[0]) ];

  // Clamp the radial coordinate
  if (X_u_obs[1] < 2.2) {
      X_u_obs[1] = 2.2;
      var rad = Math.sqrt(obs_pos_cart[0] * obs_pos_cart[0] + obs_pos_cart[1] * obs_pos_cart[1] + obs_pos_cart[2] * obs_pos_cart[2]);
      obs_pos_cart = mult(obs_pos_cart, 2.2/rad);
  }
  if (X_u_obs[1] > 99.5) {                   
      X_u_obs[1] = 99.5;
      var rad = Math.sqrt(obs_pos_cart[0] * obs_pos_cart[0] + obs_pos_cart[1] * obs_pos_cart[1] + obs_pos_cart[2] * obs_pos_cart[2]);
      obs_pos_cart = mult(obs_pos_cart, 99.5/rad);
  }

  // New bits to take care of view direction consistency with movement
  k_u_obs = normalize_null(X_u_obs, cart_to_sphere(lookdir_cart, X_u_obs));
  u_u_obs = cart_to_sphere(updir_cart, X_u_obs);

  U_u_obs = construct_U_vector(X_u_obs);
  var tet = construct_tetrad_u(X_u_obs, U_u_obs, u_u_obs, k_u_obs);
  var tet2 = [
              [tet[0][0], tet[1][0], tet[2][0], tet[3][0]],
              [tet[0][1], tet[1][1], tet[2][1], tet[3][1]],
              [tet[0][2], tet[1][2], tet[2][2], tet[3][2]],
              [tet[0][3], tet[1][3], tet[2][3], tet[3][3]]
             ];
  gl.useProgram(program);
  lc = gl.getUniformLocation(program, "obs_pos");
  gl.uniform4f(lc, X_u_obs[0], X_u_obs[1], X_u_obs[2], X_u_obs[3]);
  var tetmatloc = gl.getUniformLocation(program, "tetrad_u");
  gl.uniformMatrix4fv(tetmatloc, false, tet2.flat());

  if (leftbracket_pressed) {
    // Reduce the canvas x size
    width = document.getElementById("canvas").width;
    if (width > 100) {
      width = width - 100;
      document.getElementById("canvas").width = width;
      document.getElementById("textcanvas").width = width;
      ctx = textcanvas.getContext("2d");
      lc = gl.getUniformLocation(program, "resolution");
      gl.uniform2f(lc, width, height);
      gl.viewport(0, 0, width, height);
    }
    leftbracket_pressed = false;
  }

  if (rightbracket_pressed) {
    // Increase the canvas x size
    width = document.getElementById("canvas").width;
    width = width + 100;
    document.getElementById("canvas").width = width;
    document.getElementById("textcanvas").width = width;
    ctx = textcanvas.getContext("2d");
    lc = gl.getUniformLocation(program, "resolution");
    gl.uniform2f(lc, width, height);
    gl.viewport(0, 0, width, height);
    rightbracket_pressed = false;
  }
  if (minus_pressed) {
    // Reduce the canvas y size
    height = document.getElementById("canvas").height;
    if (height > 50) {
      height = height - 50;
      document.getElementById("canvas").height = height;
      document.getElementById("textcanvas").height = height;
      ctx = textcanvas.getContext("2d");
      lc = gl.getUniformLocation(program, "resolution");
      gl.uniform2f(lc, width, height);
      gl.viewport(0, 0, width, height);
    }
    leftbracket_pressed = false;
  }

  if (equals_pressed) {
    // Increase the canvas y size
    height = document.getElementById("canvas").height;
    height = height + 50;
    document.getElementById("canvas").height = height;
    document.getElementById("textcanvas").height = height;
    ctx = textcanvas.getContext("2d");
    lc = gl.getUniformLocation(program, "resolution");
    gl.uniform2f(lc, width, height);
    gl.viewport(0, 0, width, height);
    rightbracket_pressed = false;
  }


}

function keyup(e) {
  var keyCode = e.keyCode;
  if (keyCode == 37) left_pressed  = false;
  if (keyCode == 39) right_pressed = false;
  if (keyCode == 38) up_pressed    = false;
  if (keyCode == 40) down_pressed  = false;
  if (e.key == 'z') z_pressed = false;
  if (e.key == 'x') x_pressed = false;
  if (e.key == ']') rightbracket_pressed = false;
  if (e.key == '[') leftbracket_pressed = false;
  if (e.key == '-') minus_pressed = false;
  if (e.key == '=') equals_pressed = false;
  if (e.key == 'q') q_pressed = false;
  if (e.key == 'a') a_pressed = false;
  if (e.key == 's') s_pressed = false;
  if (e.key == 'd') d_pressed = false;
  if (e.key == 'e') e_pressed = false;
  if (e.key == 'w') w_pressed = false;

}

function mousedown(e) {
  console.log("Mouse clicked!");
  if (!pointerLock) {
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.requestPointerLock();
    console.log("Pointer locked!");
    pointerLock = true;
  } else {
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
    // Attempt to unlock
    document.exitPointerLock();
    console.log("Pointer unlocked!");
    pointerLock = false;
  }
}

// Calculate cross product of 2 3D cartesian vectors.
function cross(v1, v2) {
  var vout = [v1[1] * v2[2] - v1[2] * v2[1], v1[2] * v2[0] - v1[0] * v2[2], v1[0] * v2[1] - v1[1] * v2[0]];
  return vout;
}

// Calculate inner product of 2 3D cartesian vectors.
function inprod(v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

// Set the length of a 3D cartesian vector to 1.
function normalize(v1) {
  var l = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
  return [v1[0] / l, v1[1]/l, v1[2]/l];
}

// Multiply a cartesian vector with a scalar.
function mult(v1, s1) {
  return [v1[0] * s1, v1[1] * s1, v1[2] * s1];
}

// Add two cartesian vectors together.
function add (v1, v2) {
  return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
}

// Transform a pseudo-cartesian vector to spherical coordinates, using the observer position.
function cart_to_sphere(cv, obspos) {
  var dx = cv[0];
  var dy = cv[1];
  var dz = cv[2];
  var r = obspos[1];
  var th = obspos[2];
  var phi = obspos[3];
  var x = r * Math.sin(th) * Math.cos(phi);
  var y = r * Math.sin(th) * Math.sin(phi);
  var z = r * Math.cos(th);   

  var dr = dx * Math.cos(phi) * Math.sin(th) + 
           dy * Math.sin(phi) * Math.sin(th) +
           dz * Math.cos(th);

  var dphi = (dy * Math.cos(phi) - dx * Math.sin(phi)) / Math.sqrt(x * x + y * y);

  var dth = dx * Math.cos(th) * Math.cos(phi) / Math.sqrt(x * x + y * y + z * z) +
            dy * Math.cos(th) * Math.sin(phi) / Math.sqrt(x * x + y * y + z * z) -
            dz * Math.sin(th) / Math.sqrt(x * x + y * y + z * z);

  var res = [0., dr, dth, dphi];
  return res;
}

// Transform a vector in spherical coordinates to one in Cartesian coords using observer position
function sphere_to_cart(sv_u, obspos_u){
   var r = obspos_u[1];
   var th = obspos_u[2];
   var phi = obspos_u[3];
   var dz = Math.cos(th) * sv_u[1] - r * Math.sin(th) * sv_u[2];
   var dy = Math.sin(th) * Math.sin(phi) * sv_u[1] + r * Math.cos(th) * Math.sin(phi) * sv_u[2] + r * Math.sin(th) * Math.cos(phi) * sv_u[3];
   var dx = Math.sin(th) * Math.cos(phi) * sv_u[1] + r * Math.cos(th) * Math.cos(phi) * sv_u[2] - r * Math.sin(th) * Math.sin(phi) * sv_u[3];

   var res = [dx, dy, dz];
   return res;
}

function mousemove(e) {
  // Down and to the right is positive
  if (pointerLock) {
    if (e.movementX != 0 || e.movementY != 0) {
      // Let's use our pseudo-cartesian orientation and our mouse move vector to determine our rotation vector.
      // We then need to update our two camera vectors (lookdir, updir) according to this rotation.
      var rightdir_cart = normalize(cross(lookdir_cart, updir_cart));

      // Rotate lookdir horizontally
      var lookdir_cart_r = add(mult(lookdir_cart, Math.cos(e.movementX / 100.)), mult(rightdir_cart, Math.sin(e.movementX / 100.)));
      // Rotate rightdir horizontally
      var rightdir_cart_r = add(mult(rightdir_cart, Math.cos(e.movementX / 100.)), mult(lookdir_cart, -Math.sin(e.movementX / 100.)));
      // Rotate updir vertically, using new horizontally moved lookdir
      var updir_cart_r = add(mult(updir_cart, Math.cos(e.movementY / 100.)), mult(lookdir_cart_r, Math.sin(e.movementY / 100.)));
      // Get new lookdir by crossing new right and new up.
      lookdir_cart_r = normalize(cross(updir_cart_r, rightdir_cart_r));

      // Previous, composite rotation algorithm. Does not work properly (but should!). Left alone for now.
      /*
      var rotdir_cart = normalize(add(mult(updir_cart, e.movementX), mult(rightdir_cart, e.movementY)));
      console.log("rotation axis: ", rotdir_cart);
      var angle = Math.sqrt(e.movementX * e.movementX + e.movementY * e.movementY)/100.;
      //console.log("rotation angle: ", angle);
      var lookdir_cart_r = add(add(mult(lookdir_cart, Math.cos(angle)),
		           mult(normalize(cross(rotdir_cart,lookdir_cart)),Math.sin(-angle))), 
		           mult(mult(rotdir_cart, inprod(rotdir_cart, lookdir_cart)), (1. - Math.cos(angle))));
      var updir_cart_r = updir_cart;
      // NOTE: we can only rotate our 'up' vector if our mouse movement has a y-component!
      // Otherwise our cross-product will collapse as our up direction does not change,
      // with only an x movement of the mouse.
      if (e.movementY != 0) {
        updir_cart_r = add(add(mult(updir_cart, Math.cos(angle)),
	      	               mult(normalize(cross(rotdir_cart,updir_cart)),Math.sin(-angle))), 
		           mult(mult(rotdir_cart, inprod(rotdir_cart, updir_cart)), (1. - Math.cos(angle))));
      }
      */

      // We can now update our k_u_obs vector and u_u_obs vector with these two.
      // NOTE: we have to take care because the world direction of k_u_obs depends on what X_u_obs is.
      // So, we need to capture the relation between the rotated cartesian directions and our observer position
      // to effectively calculate k_u_obs and u_u_obs.
      k_u_obs = cart_to_sphere(lookdir_cart_r, X_u_obs);
      k_u_obs = normalize_null(X_u_obs, cart_to_sphere(lookdir_cart_r, X_u_obs));
      u_u_obs = cart_to_sphere(updir_cart_r, X_u_obs);

      // Refresh cartesian look/up vectors with rotated ones
      lookdir_cart = lookdir_cart_r;
      updir_cart = updir_cart_r;

      // re-construct our camera tetrad with the updated vectors
      var tet = construct_tetrad_u(X_u_obs, U_u_obs, u_u_obs, k_u_obs);

      var tet2 = [
        [tet[0][0], tet[1][0], tet[2][0], tet[3][0]],
        [tet[0][1], tet[1][1], tet[2][1], tet[3][1]],
        [tet[0][2], tet[1][2], tet[2][2], tet[3][2]],
        [tet[0][3], tet[1][3], tet[2][3], tet[3][3]]
        ];

      // Upload our new tetrad to the GPU
      var tetmatloc = gl.getUniformLocation(program, "tetrad_u");
      gl.uniformMatrix4fv(tetmatloc, false, tet2.flat());
    }
  }
}

function render() {
  now = Date.now();
  if (now - then > fpsInterval) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = "20px Arial";
    ctx.fillStyle = "white";
    ctx.fillText("Current radius: " + X_u_obs[1].toFixed(2).toString(), 10, height - 10);
    then = now;
    checkInput();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  requestAnimationFrame(render);
}

/////////////// Shader functions reproduced here for testing ////////

//vec4 normt(vec4 invec) {
//  invec.x = sqrt(invec.y * invec.y + invec.z * invec.z + invec.w * invec.w);
//  return invec;
//}
function shader_normt(iv) {
  iv[0] = Math.sqrt(iv[1] * iv[1] + iv[2] * iv[2] + iv[3] * iv[3]);
  return iv;
}

//vec3 convert_lookdir_to_cartesian(vec4 l, vec4 p) {
//  vec3 cl = normalize(vec3(l.y * sin(p.z) * cos(p.w) + l.z * p.y * cos(p.z) * cos(p.w) + l.w * -p.y * sin(p.z) * sin(p.w),
//                           l.y * sin(p.z) * sin(p.w) + l.z * p.y * cos(p.z) * sin(p.w) + l.w *  p.y * sin(p.z) * cos(p.w),
//                           l.y * cos(p.z)            - l.z * p.y * sin(p.z)            + 0.));
//  return cl;
//}
function shader_convert_lookdir_to_cartesian(vl, vp) {
  var vcl = [vl[1] * Math.sin(vp[2]) * Math.cos(vp[3]) + vl[2] * vp[1] * Math.cos(vp[2]) * Math.cos(vp[3]) + vl[3] * -vp[1] * Math.sin(vp[2]) * Math.sin(vp[3]),
	 vl[1] * Math.sin(vp[2]) * Math.sin(vp[3]) + vl[2] * vp[1] * Math.cos(vp[2]) * Math.sin(vp[3]) + vl[3] *  vp[1] * Math.sin(vp[2]) * Math.cos(vp[3]),
	 vl[1] * Math.cos(vp[2])                   - vl[2] * vp[1] * Math.sin(vp[2])];
  var vcllength = Math.sqrt(vcl[0] * vcl[0] + vcl[1] * vcl[1] + vcl[2] * vcl[2]);
  vcl[0] = vcl[0] / vcllength;
  vcl[1] = vcl[1] / vcllength;
  vcl[2] = vcl[2] / vcllength;
  return vcl;
}

//vec3 convert_position_to_cartesian(vec4 p) {
//  vec3 cp = normalize(vec3(sin(p.z) * cos(p.w), sin(p.z) * sin(p.w), cos(p.z)));
//  return cp;
//}
function shader_convert_position_to_cartesian(vp) {
  var vcp = [Math.sin(vp[2]) * Math.cos(vp[3]), Math.sin(vp[2]) * Math.sin(vp[3]), Math.cos(vp[2])];
  return vcp;
}

//vec3 inprod(vec4 l, vec4 p, out float mag) {
//  // Only use spatial components of the 4-vectors for now.
//  // x = t, y = r, z = theta, w = phi.
//  //Make cartesian versions of both vectors, pretending we are in flat space.
//  vec3 cl = normalize(vec3(l.y * sin(p.z) * cos(p.w) + l.z * p.y * cos(p.z) * cos(p.w) + l.w * -p.y * sin(p.z) * sin(p.w),
//                           l.y * sin(p.z) * sin(p.w) + l.z * p.y * cos(p.z) * sin(p.w) + l.w *  p.y * sin(p.z) * cos(p.w),
//                           l.y * cos(p.z)            - l.z * p.y * sin(p.z)            + 0.));
//  vec3 cp = normalize(vec3(sin(p.z) * cos(p.w), sin(p.z) * sin(p.w), cos(p.z)));
//  mag = (cl.x * cp.x + cl.y * cp.y + cl.z * cp.z);
//  return cross(cp, cl);
//}
function shader_inprod(vl, vp) {
  var vcl = [vl[1] * Math.sin(vp[2]) * Math.cos(vp[3]) + vl[2] * vp[1] * Math.cos(vp[2]) * Math.cos(vp[3]) + vl[3] * -vp[1] * Math.sin(vp[2]) * Math.sin(vp[3]),
    	     vl[1] * Math.sin(vp[2]) * Math.sin(vp[3]) + vl[2] * vp[1] * Math.cos(vp[2]) * Math.sin(vp[3]) + vl[3] *  vp[1] * Math.sin(vp[2]) * Math.cos(vp[3]),
	     vl[1] * Math.cos(vp[2])                   - vl[2] * vp[1] * Math.sin(vp[2])];
  var vcllength = Math.sqrt(vcl[0] * vcl[0] + vcl[1] * vcl[1] + vcl[2] * vcl[2]);
  vcl[0] = vcl[0] / vcllength;
  vcl[1] = vcl[1] / vcllength;
  vcl[2] = vcl[2] / vcllength;
  var vcp = [Math.sin(vp[2]) * Math.cos(vp[3]), Math.sin(vp[2]) * Math.sin(vp[3]), Math.cos(vp[2])];
  var mag = vcl[0] * vcp[0] + vcl[1] * vcp[1] + vcl[2] * vcp[2];
  var cross = [vcp[1] * vcl[2] - vcl[1] * vcp[2],
	       vcp[2] * vcl[0] - vcl[2] * vcp[0],
	       vcp[0] * vcl[1] - vcl[0] * vcp[1]];
  return [mag, cross];
}

function testcamera(X_u_obs, U_u_obs, u_u_obs, k_u_obs) {
  var camvec = [1., 0., 0., 1.];
  var camvec_length = Math.sqrt(camvec[1] * camvec[1] + camvec[2] * camvec[2] + camvec[3] * camvec[3]);
  camvec[1] = camvec[1] / camvec_length;
  camvec[2] = camvec[2] / camvec_length;
  camvec[3] = camvec[3] / camvec_length;
  var tet = construct_tetrad_u(X_u_obs, U_u_obs, u_u_obs, k_u_obs);
  var camvec_world = [tet[0][0] * camvec[0] + tet[0][1] * camvec[1] + tet[0][2] * camvec[2] + tet[0][3] * camvec[3],
	              tet[1][0] * camvec[0] + tet[1][1] * camvec[1] + tet[1][2] * camvec[2] + tet[1][3] * camvec[3],
	              tet[2][0] * camvec[0] + tet[2][1] * camvec[1] + tet[2][2] * camvec[2] + tet[2][3] * camvec[3],
	              tet[3][0] * camvec[0] + tet[3][1] * camvec[1] + tet[3][2] * camvec[2] + tet[3][3] * camvec[3]
                      ];
  console.log("Camera world: ", camvec_world); // This should be the same as k_u_obs
  var camvec_cart = shader_convert_lookdir_to_cartesian(camvec_world, X_u_obs);
  var obspos_cart = shader_convert_position_to_cartesian(X_u_obs);
  console.log("Camera cartesian: ", camvec_cart);
  console.log("Position cartesian: ",obspos_cart);
}

/////////////////////////////////////////////////////////////////////


function main() {
  console.log("Starting!");

  // Test area for GR functions.
  console.log("X_u_obs = ", X_u_obs);
  console.log("U_u_obs = ", U_u_obs);
  var inp = inner_product(X_u_obs, U_u_obs, U_u_obs);
  console.log("inner prod X and U is: ", inp);

  //var k_u_obs = [0., -1., 0., 0.];
  console.log("initial k_u_obs = ", k_u_obs);
  k_u_obs = normalize_null(X_u_obs, k_u_obs);
  console.log("normalized k_u_obs = ", k_u_obs);

  console.log("k_u_obs inner product is: ", inner_product(X_u_obs, k_u_obs, k_u_obs));

  console.log("levciv is ", levciv);

  console.log("Constructing tetrad...");
  var tet = construct_tetrad_u(X_u_obs, U_u_obs, u_u_obs, k_u_obs);
  console.log("tetrad is ", tet);

  var tet2 = [
	  [tet[0][0], tet[1][0], tet[2][0], tet[3][0]],
	  [tet[0][1], tet[1][1], tet[2][1], tet[3][1]],
	  [tet[0][2], tet[1][2], tet[2][2], tet[3][2]],
	  [tet[0][3], tet[1][3], tet[2][3], tet[3][3]]
  ];

  console.log("e_u[0] = ",tet2[0]);
  console.log("Inner product e_u[0] with e_u[0] is ", inner_product(X_u_obs, tet2[0], tet2[0]));
  console.log("Inner product e_u[0] with e_u[1] is ", inner_product(X_u_obs, tet2[0], tet2[1]));
  console.log("Inner product e_u[0] with e_u[2] is ", inner_product(X_u_obs, tet2[0], tet2[2]));
  console.log("Inner product e_u[0] with e_u[3] is ", inner_product(X_u_obs, tet2[0], tet2[3]));

  console.log("e_u[1] = ",tet2[1]);
  console.log("Inner product e_u[1] with e_u[0] is ", inner_product(X_u_obs, tet2[1], tet2[0]));
  console.log("Inner product e_u[1] with e_u[1] is ", inner_product(X_u_obs, tet2[1], tet2[1]));
  console.log("Inner product e_u[1] with e_u[2] is ", inner_product(X_u_obs, tet2[1], tet2[2]));
  console.log("Inner product e_u[1] with e_u[3] is ", inner_product(X_u_obs, tet2[1], tet2[3]));

  console.log("e_u[2] = ",tet2[2]);
  console.log("Inner product e_u[2] with e_u[0] is ", inner_product(X_u_obs, tet2[2], tet2[0]));
  console.log("Inner product e_u[2] with e_u[1] is ", inner_product(X_u_obs, tet2[2], tet2[1]));
  console.log("Inner product e_u[2] with e_u[2] is ", inner_product(X_u_obs, tet2[2], tet2[2]));
  console.log("Inner product e_u[2] with e_u[3] is ", inner_product(X_u_obs, tet2[2], tet2[3]));

  console.log("e_u[3] = ",tet2[3]);
  console.log("Inner product e_u[3] with e_u[0] is ", inner_product(X_u_obs, tet2[3], tet2[0]));
  console.log("Inner product e_u[3] with e_u[1] is ", inner_product(X_u_obs, tet2[3], tet2[1]));
  console.log("Inner product e_u[3] with e_u[2] is ", inner_product(X_u_obs, tet2[3], tet2[2]));
  console.log("Inner product e_u[3] with e_u[3] is ", inner_product(X_u_obs, tet2[3], tet2[3]));

  //testcamera(X_u_obs, U_u_obs, u_u_obs, k_u_obs);

  canvas = document.getElementById('canvas');
  width = canvas.width;
  height = canvas.height;

  // look up the text canvas.
  textcanvas = document.getElementById("textcanvas");
  // make a 2D context for it
  ctx = textcanvas.getContext("2d");

  fps = 900.;
  fpsInterval = 1000 / fps;

  // Add key press event listener
  document.body.addEventListener("keydown", keydown, false);
  document.body.addEventListener("keyup", keyup, false);

  document.body.addEventListener("mousedown", mousedown, false);
  document.body.addEventListener("mousemove", mousemove, false);

  // Get A WebGL context
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
  var texcoordAttributeLocation = gl.getAttribLocation(program, "a_texcoord");

  // Upload texture coordinates to shader
  // create the texcoord buffer, make it the current ARRAY_BUFFER
  // and copy in the texcoord values
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  setTexcoords(gl);
   
  // Turn on the attribute
  gl.enableVertexAttribArray(texcoordAttributeLocation);
   
  // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floating point values
  var normalize = true;  // convert from 0-255 to 0.0-1.0
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next color
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(texcoordAttributeLocation, size, type, normalize, stride, offset);

  // Create a texture.
  var texture1 = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture1);
   
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 255, 255]));
   
  // Asynchronously load an image
  var image1 = new Image();
  image1.src = "deflectionmap_2048.png";
  image1.addEventListener('load', function() {
    // Now that the image has loaded make copy it to the texture.
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image1);
    gl.generateMipmap(gl.TEXTURE_2D);
    //gl.bindTexture(gl.TEXTURE_2D, null);
  });

  // Create a second texture.
  var texture2 = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture2);

  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 255, 255]));

  // Wait loop (used to test if a delay between image loadings would help to properly load both)
  //var start = new Date().getTime();
  //for (var i = 0; i < 1e7; i++) {
  //  if ((new Date().getTime() - start) > 2000){
  //    break;
  //  }
  //}

  var image2 = new Image(); // Load another image
  //image2.src = "simple.png";
  image2.src = "starmap_hires2.jpg";
  //image2.src = "starmap_lores.jpg";
  image2.addEventListener('load', function() {
    // Now that the image has loaded make copy it to the texture.
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image2);
    gl.generateMipmap(gl.TEXTURE_2D);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
    //gl.bindTexture(gl.TEXTURE_2D, null);
  });

  gl.useProgram(program);

  // Set each texture unit to use a particular texture.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture1);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture2);

  // lookup the sampler locations.
  var u_image0Location = gl.getUniformLocation(program, "u_texture_deflection");
  var u_image1Location = gl.getUniformLocation(program, "u_texture_background");
 
  // set which texture units to render with.
  gl.uniform1i(u_image0Location, 0);  // texture unit 0
  gl.uniform1i(u_image1Location, 1);  // texture unit 1

  // Look up locations of other variables
  // Make sure that we are using the right program first.
  gl.useProgram(program);

  // The line below is how we ask the shader to give us the location in memory where a
  // 'uniform' type variable is stored in the shader code. Once we have this location,
  // we can write data into it.
  lc = gl.getUniformLocation(program, "resolution");
  gl.uniform2f(lc, width, height);

  lc = gl.getUniformLocation(program, "alpha_corr");
  gl.uniform1f(lc, alpha_corr);    

  var tetmatloc = gl.getUniformLocation(program, "tetrad_u");
  gl.uniformMatrix4fv(tetmatloc, false, tet2.flat());

  var Xobsloc = gl.getUniformLocation(program, "obs_pos");
  gl.uniform4f(Xobsloc, X_u_obs[0], X_u_obs[1], X_u_obs[2], X_u_obs[3]);

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

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

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

// Fill the buffer with texture coordinates for the F.
function setTexcoords(gl) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        // left column front
        0, 0,
        0, 1,
        1, 0,
        0, 1,
        1, 0,
        1, 1,
       ]),
       gl.STATIC_DRAW);
}

main();

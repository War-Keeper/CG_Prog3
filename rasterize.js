/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0; // default graphics window z coord in world space
const WIN_LEFT = 0;
const WIN_RIGHT = 1; // default left and right x coords in world space
const WIN_BOTTOM = 0;
const WIN_TOP = 1; // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
const INPUT_ELLIPSOIDS_URL = "https://ncsucgclass.github.io/prog3/ellipsoids.json";
//const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog3/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5, 0.5, -0.5, 1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var altPosition; // flag indicating whether to alter vertex positions
var vertexPositionAttrib; // where to put position for vertex shader
var altPositionUniform; // where to put altPosition flag for vertex shader
var color; // The color of the vertex
var normal;
var colorBuffer; // The color buffer
var normBuffer; // The normals buffer

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url, descr) {
  try {
    if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
      throw "getJSONFile: parameter not a string";
    else {
      var httpReq = new XMLHttpRequest(); // a new http request
      httpReq.open("GET", "triangles.json", false); // init the request
      httpReq.send(null); // send the request
      var startTime = Date.now();
      while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
        if ((Date.now() - startTime) > 3000)
          break;
      } // until its loaded or we time out after three seconds
      if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
        throw "Unable to open " + descr + " file!";
      else
        return JSON.parse(httpReq.response);
    } // end if good params
  } // end try
  catch (e) {
    console.log(e);
    return (String.null);
  }
} // end get input spheres

// set up the webGL environment
function setupWebGL() {

  // Get the canvas and context
  var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
  gl = canvas.getContext("webgl"); // get a webgl object from it

  try {
    if (gl == null) {
      throw "unable to create gl context -- is your browser gl ready?";
    } else {
      gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
      gl.clearDepth(1.0); // use max when we clear the depth buffer
      gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
    }
  } // end try
  catch (e) {
    console.log(e);
  } // end catch

} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
  var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL, "triangles");
  if (inputTriangles != String.null) {
    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set
    var coordArray = []; // 1D array of vertex coords for WebGL
    var indexArray = []; // 1D array of vertex indices for WebGL
    var ambient = []; // 1D array of ambient color values for each triangle
    var diffuse = []; // 1D array of diffuse color values for each triangle
    var specular = []; // 1D array of specular color values for each triangle
    var normalArray = []; // 1D array of Normal values for each vertex
    var vtxBufferSize = 0; // the number of vertices in the vertex buffer
    var vtxToAdd = []; // vtx coords to add to the coord array
    var indexOffset = vec3.create(); // the index offset for the current set
    var triToAdd = vec3.create(); // tri indices to add to the index array

    for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
      vec3.set(indexOffset, vtxBufferSize, vtxBufferSize, vtxBufferSize); // update vertex offset

      // set up the vertex coord array
      for (whichSetVert = 0; whichSetVert < inputTriangles[whichSet].vertices.length; whichSetVert++) {
       coordArray = coordArray.concat(inputTriangles[whichSet].vertices[whichSetVert]);

      }

      // set up the triangle index array, adjusting indices across sets
      for (whichSetTri = 0; whichSetTri < inputTriangles[whichSet].triangles.length; whichSetTri++) {
        vec3.add(triToAdd, indexOffset, inputTriangles[whichSet].triangles[whichSetTri]);
        indexArray.push(triToAdd[0], triToAdd[1], triToAdd[2]);
      } // end for triangles in set

      // set up the ambient color array
      var tn = inputTriangles[whichSet].triangles.length;
      for (var t = 0; t < tn; t++) {
        for (var i = 0; i < 3; i++) {
          ambient.push(inputTriangles[whichSet].material.ambient[0]);
          ambient.push(inputTriangles[whichSet].material.ambient[1]);
          ambient.push(inputTriangles[whichSet].material.ambient[2]);
        }
      }

      // set up the diffuse color array
      var tn = inputTriangles[whichSet].triangles.length;
      for (var t = 0; t < tn; t++) {
        for (var i = 0; i < 3; i++) {
          diffuse.push(inputTriangles[whichSet].material.diffuse[0]);
          diffuse.push(inputTriangles[whichSet].material.diffuse[1]);
          diffuse.push(inputTriangles[whichSet].material.diffuse[2]);
        }
      }

      // set up the specular color array
      var tn = inputTriangles[whichSet].triangles.length;
      for (var t = 0; t < tn; t++) {
        for (var i = 0; i < 3; i++) {
          specular.push(inputTriangles[whichSet].material.specular[0]);
          specular.push(inputTriangles[whichSet].material.specular[1]);
          specular.push(inputTriangles[whichSet].material.specular[2]);
        }
      }

      // set up the normals array
      for (whichSetNorm = 0; whichSetNorm < inputTriangles[whichSet].normals.length; whichSetNorm++) {
        normToAdd = inputTriangles[whichSet].normals[whichSetNorm];
        normalArray.push(normToAdd[0], normToAdd[1], normToAdd[2]);
      } // end for vertices in set

      vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
      triBufferSize += inputTriangles[whichSet].triangles.length; // total number of tris
    } // end for each triangle set
    // console.log(coordArray.length);
    triBufferSize *= 3; // now total number of indices
    // send the vertex coords to webGL
    vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW); // coords to that buffer


    // send the triangle indices to webGL
    triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexArray), gl.STATIC_DRAW); // indices to that buffer


    // send the diffuse colors to webGL
    amb_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, amb_buffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ambient), gl.STATIC_DRAW); // indices to that buffer

    // send the diffuse colors to webGL
    diff_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, diff_buffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(diffuse), gl.STATIC_DRAW); // indices to that buffer

    // send the diffuse colors to webGL
    spec_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, spec_buffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(specular), gl.STATIC_DRAW); // indices to that buffer

    // send the normals to webGL
    normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(normalArray), gl.STATIC_DRAW); // indices to that buffer


  } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {

  // define fragment shader in essl using es6 template strings
  var fShaderCode = `
        precision mediump float;
        varying vec3 vDiff;
        varying vec3 vNormal;
        void main(void) {
            gl_FragColor = vec4(vDiff, 1.0); // all fragments are white
        }
    `;

  // define vertex shader in essl using es6 template strings
  var vShaderCode = `
        attribute vec3 vertexPosition;
        uniform bool altPosition;
        attribute vec3 ambient;
        attribute vec3 diffuse;
        attribute vec3 specular;
        attribute vec3 normal;
        varying vec3 vNormal;
        varying vec3 vAmb;
        varying vec3 vDiff;
        varying vec3 vSpec;
        void main(void) {
            if(altPosition)
                gl_Position = vec4(vertexPosition + vec3(-1.0, -1.0, 0.0), 1.0); // use the altered position
            else
                gl_Position = vec4(vertexPosition, 1.0); // use the untransformed position
            vAmb = ambient;
            vDiff = diffuse;
            vSpec = specular;
            vNormal = normal;
        }
    `;

  try {
    // console.log("fragment shader: "+fShaderCode);
    var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
    gl.shaderSource(fShader, fShaderCode); // attach code to shader
    gl.compileShader(fShader); // compile the code for gpu execution

    // console.log("vertex shader: "+vShaderCode);
    var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
    gl.shaderSource(vShader, vShaderCode); // attach code to shader
    gl.compileShader(vShader); // compile the code for gpu execution

    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
      throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
      gl.deleteShader(fShader);
    } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
      throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
      gl.deleteShader(vShader);
    } else { // no compile errors
      var shaderProgram = gl.createProgram(); // create the single shader program
      gl.attachShader(shaderProgram, fShader); // put frag shader in program
      gl.attachShader(shaderProgram, vShader); // put vertex shader in program
      gl.linkProgram(shaderProgram); // link program into gl context

      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
        throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
      } else { // no shader program link errors
        gl.useProgram(shaderProgram); // activate shader program (frag and vert)
        vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition"); // get pointer to vertex shader input
        ambient = gl.getAttribLocation(shaderProgram, "ambient");
        diffuse = gl.getAttribLocation(shaderProgram, "diffuse");
        specular = gl.getAttribLocation(shaderProgram, "specular");
        normal = gl.getAttribLocation(shaderProgram, "normal");
        gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
        altPositionUniform = gl.getUniformLocation(shaderProgram, "altPosition"); // get pointer to altPosition flag
        gl.enableVertexAttribArray(ambient); // input to shader from ambient color array
        gl.enableVertexAttribArray(diffuse); // input to shader from diffuse color array
        gl.enableVertexAttribArray(specular); // input to shader from specular color array
        gl.enableVertexAttribArray(normal); // input to shader from the normal array
      } // end if no shader program link errors
    } // end if no compile errors
  } // end try
  catch (e) {
    console.log(e);
  } // end catch
  altPosition = false;
  setTimeout(function alterPosition() {
    altPosition = !altPosition;
    setTimeout(alterPosition, 2000);
  }, 2000); // switch flag value every 2 seconds
} // end setup shaders
var bgColor = 0;
// render the loaded model
function renderTriangles() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
  bgColor = (bgColor < 1) ? (bgColor + 0.001) : 0;
  gl.clearColor(bgColor, 0, 0, 1.0);
  requestAnimationFrame(renderTriangles);

  // vertex buffer: activate and feed into vertex shader
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); // activate
  //gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0); // feed
  gl.uniform1i(altPositionUniform, altPosition); // feed

  // triangle buffer: activate and render
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate
  gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0); // feed

  // ambient color buffer: activate and feed to vertex shader
  gl.bindBuffer(gl.ARRAY_BUFFER, amb_buffer);
  gl.vertexAttribPointer(ambient, 3, gl.FLOAT, false, 0, 0);

  // diffuse color buffer: activate and feed to vertex shader
  gl.bindBuffer(gl.ARRAY_BUFFER, diff_buffer);
  gl.vertexAttribPointer(diffuse, 3, gl.FLOAT, false, 0, 0);

  // diffuse color buffer: activate and feed to vertex shader
  gl.bindBuffer(gl.ARRAY_BUFFER, spec_buffer);
  gl.vertexAttribPointer(specular, 3, gl.FLOAT, false, 0, 0);

  // Normal buffer: activate and feed to vertex shader
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
  gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 0, 0);
  gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0); // render
  //gl.drawArrays(gl.TRIANGLES, 0, 3); // render
} // end render triangles


/* MAIN -- HERE is where execution begins after window load */

function main() {

  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL

} // end main

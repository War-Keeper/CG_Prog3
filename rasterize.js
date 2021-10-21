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
var xEye = 0.5;
var yEye = 0.5;
var zEye = -0.5;
var Eye = [xEye, yEye, zEye, 1.0]; // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer = []; // this contains vertex coordinates in triples
var triangleBuffer = []; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var indexArray; // the triangle index array
var coordArray; // the vertex coordinates array
var altPosition; // flag indicating whether to alter vertex positions
var vertexPositionAttrib; // where to put position for vertex shader
var altPositionUniform; // where to put altPosition flag for vertex shader
var ambient, diffuse, specular; // The ambient, diffuse, and specular vertex color arrays
var normal; // the vertex normals array
var reflect; // the reflectivity of the vertex
var lightAmbient, lightDiffuse, lightSpecular; // light ambient, diffuse, specular values
var lightCoords; // the coordinates of the light
var La; // ambient light pointer
var Ld; // diffuse light pointer
var Ls; // specular light pointer
var LPos; // light position pointer
var amb_buffer = [],
  diff_buffer = [],
  spec_buffer = []; // the ambient, diffuse, and specular buffers
var normBuffer = []; // The normals buffer
var reflectBuffer = []; // The reflectivity buffer
var ambLight_buffer; // the ambient light buffer
var diffLight_buffer; // the diffuse light buffer
var specLight_buffer; // the specular light buffer
var lightCoords_buffer; // the light coordinates buffer
var Pmatrix; // the projection matrix
var Vmatrix; // the view matrix
var Mmatrix; // the model matrix
var proj_matrix = mat4.create(); // the projection matrix
var view_matrix = mat4.create(); // the view matrix
var mov_matrix = mat4.create(); // the model matrix
var lookAt; // the look at vector
var yawAngle = 0.0; // the initial yaw angle
var lookUp; // the look up vector
var pitchAngle = 0.0; // the initial pitch angle
var mvPosition; // the model view position
var ids; // the array of ids
var selectionScale; // the selection scale
var selectionScaleMatrix = mat4.create(); // the selection scale matrix
var sID; // the id of the current selection
var selectionID = -1.0; // the initial selection id
var tcenters; // the array of triangle centers
var matrices = []; // the array of triangle matrices
var numTriangleSets; // the number of triangles in the triangle array
var MmatrixArray = []; // the model matrix array
var NmatrixArray = []; // the normal matrix array
var tempM; // temp matrix vector
var tempM2; // temp matrix vector
var tempM3; // temp matrix vector
var mInvert; // an inverted matrix
var mTranspose; // a transposed matrix
// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url, descr) {
  try {
    if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
      throw "getJSONFile: parameter not a string";
    else {
      var httpReq = new XMLHttpRequest(); // a new http request
      httpReq.open("GET", url, false); // init the request
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
  var inputLights = getJSONFile("lights.json", "lights");
  if (inputTriangles != String.null) {
    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set
    coordArray = []; // 1D array of vertex coords for WebGL
    indexArray = []; // 1D array of vertex indices for WebGL
    ambient = []; // 1D array of ambient color values for each triangle
    diffuse = []; // 1D array of diffuse color values for each triangle
    specular = []; // 1D array of specular color values for each triangle
    normal = []; // 1D array of Normal values for each vertex
    reflect = []; // reflectivity values
    ids = []; // vertex ids
    var vtxBufferSize = 0; // the number of vertices in the vertex buffer
    var vtxToAdd = []; // vtx coords to add to the coord array
    var indexOffset = vec3.create(); // the index offset for the current set
    var triToAdd = vec3.create(); // tri indices to add to the index array
    lightAmbient = []; // light ambient values
    lightDiffuse = []; // light diffuse values
    lightSpecular = []; // light specular values
    lightCoords = []; // light coordinate array
    var startId = 0.0; // the initial id for the selection matrix
    var centerArray = []; // the array of triangle centers
    var rotationSets = []; // the array of rotation sets
    var translationSets = []; // the array of translation sets

    // get triangles and associated values
    numTriangleSets = inputTriangles.length;
    for (var whichSet = 0; whichSet < numTriangleSets; whichSet++) {
      vec3.set(indexOffset, vtxBufferSize, vtxBufferSize, vtxBufferSize); // update vertex offset

      // set up the vertex coord array
      for (whichSetVert = 0; whichSetVert < inputTriangles[whichSet].vertices.length; whichSetVert++) {
        vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
        coordArray.push(vtxToAdd[0], vtxToAdd[1], vtxToAdd[2]);
      }
      // send the vertex coords to webGL
      vertexBuffer[whichSet] = gl.createBuffer(); // init empty vertex coord buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer[whichSet]); // activate that buffer
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW); // coords to that buffer

      // set up the triangle index array, adjusting indices across sets
      for (whichSetTri = 0; whichSetTri < inputTriangles[whichSet].triangles.length; whichSetTri++) {
        vec3.add(triToAdd, indexOffset, inputTriangles[whichSet].triangles[whichSetTri]);
        indexArray.push(triToAdd[0], triToAdd[1], triToAdd[2]);
      } // end for triangles in set
      // send the triangle indices to webGL
      triangleBuffer[whichSet] = gl.createBuffer(); // init empty triangle index buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer[whichSet]); // activate that buffer
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexArray), gl.STATIC_DRAW); // indices to that buffer

      // set up the ambient color array
      for (var i = 0; i < inputTriangles[whichSet].vertices.length; i++) {
        ambient = ambient.concat(inputTriangles[whichSet].material.ambient);
      }
      // send the ambient colors to webGL
      amb_buffer[whichSet] = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, amb_buffer[whichSet]); // activate that buffer
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ambient), gl.STATIC_DRAW); // indices to that buffer

      // set up the diffuse color array
      for (var i = 0; i < inputTriangles[whichSet].vertices.length; i++) {
        diffuse = diffuse.concat(inputTriangles[whichSet].material.diffuse);
      }
      // send the diffuse colors to webGL
      diff_buffer[whichSet] = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, diff_buffer[whichSet]); // activate that buffer
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(diffuse), gl.STATIC_DRAW); // indices to that buffer

      // set up the specular color array
      for (var i = 0; i < inputTriangles[whichSet].vertices.length; i++) {
        specular = specular.concat(inputTriangles[whichSet].material.specular);
      }
      // send the specular colors to webGL
      spec_buffer[whichSet] = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, spec_buffer[whichSet]); // activate that buffer
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(specular), gl.STATIC_DRAW); // indices to that buffer

      // set up the normals array
      for (var i = 0; i < inputTriangles[whichSet].vertices.length; i++) {
        normal = normal.concat(inputTriangles[whichSet].normals[i]);
      } // end for vertices in set
      // send the triangle normals to webGL
      normBuffer[whichSet] = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer[whichSet]); // activate that buffer
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal), gl.STATIC_DRAW); // indices to that buffer

      // set up the reflectivity values
      for (var i = 0; i < inputTriangles[whichSet].vertices.length; i++) {
        reflect = reflect.concat(inputTriangles[whichSet].material.n);
      } // end for vertices in set
      // sent the triangle reflectivity values to webGL
      reflectBuffer[whichSet] = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, reflectBuffer[whichSet]); // activate that buffer
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(reflect), gl.STATIC_DRAW);

      // set up the ids for each vertex
      for (var i = 0; i < inputTriangles[whichSet].vertices.length; i++) {
        ids = ids.concat(startId);
      } // end for vertices in set
      // send the vertex ids to webgl

      var temp = [];
      for (whichSetVert = 0; whichSetVert < inputTriangles[whichSet].vertices.length; whichSetVert++) {
        vtxToAdd2 = inputTriangles[whichSet].vertices[whichSetVert];
        temp.push(vec3.fromValues(vtxToAdd2[0], vtxToAdd2[1], vtxToAdd2[2]));
      }
      // Find the midpoint of each shape
      var add = vec3.fromValues(0, 0, 0);
      for (var i = 0; i < temp.length; i++) {
        vec3.add(add, add, temp[i]);
      }
      var mid = vec3.fromValues(0, 0, 0);
      vec3.div(mid, add, vec3.fromValues(temp.length, temp.length, temp.length));

      // push the triangle center
      centerArray.push(mid);
      // set the triangle rotation and tranlsation sets
      rotationSets[whichSet] = vec3.fromValues(0, 0, 0);
      translationSets[whichSet] = vec3.fromValues(mid[0], mid[1], mid[2]);

      vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
      triBufferSize += inputTriangles[whichSet].triangles.length; // total number of tris
      startId++;
      // create a matrix for this triangle in the triangle matrix
      matrices[whichSet] = mat4.create();
    } // end for each triangle set
    // console.log(coordArray.length);
    triBufferSize *= 3; // now total number of indices
    // get lights and associated values
    // get the light coordinates
    lightCoords.push(inputLights[0].x);
    lightCoords.push(inputLights[0].y);
    lightCoords.push(inputLights[0].z);
    // get the light ambient
    lightAmbient = lightAmbient.concat(inputLights[0].ambient);
    // light diffuse
    lightDiffuse = lightDiffuse.concat(inputLights[0].diffuse);
    // and light specular
    lightSpecular = lightSpecular.concat(inputLights[0].specular);
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    //mat4.lookAt(view_matrix, new vec3.fromValues(xEye, yEye, zEye), new vec3.fromValues(0, 0, 1), new vec3.fromValues(0, 1, 0));
    //proj_matrix = new mat4.fromValues(1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,1,0);
    //mat4.frustum(proj_matrix, 0, 1, 0, 1, 0, 1);
    mat4.perspective(proj_matrix, 90 * Math.PI / 180, canvas.width / canvas.height, 0.5, 10.5);
    mov_matrix = mat4.fromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    lookAt = [Eye[0], Eye[1], Eye[2] + 1];
    lookUp = [0.0, 1.0, 0.0];
    //vec3.rotateX(lookUp, lookUp, vec3.fromValues(0, 0, 0), 0.5);
    //vec3.rotateY(lookAt, lookAt, vec3.fromValues(0, 0, 0), 0.5);
    const bodyElement = document.querySelector("body");
    bodyElement.addEventListener("keydown", KeyDown, false);

    function KeyDown(event) {
      // translate view left
      if ("d" === event.key) {
        Eye[0] -= 0.05;
        lookAt[0] -= 0.05;
      }
      // translate view right
      if ("a" === event.key) {
        Eye[0] += 0.05;
        lookAt[0] += 0.05;
      }
      // trnaslate view forward
      if ("w" === event.key) {
        Eye[1] -= 0.05;
        lookAt[1] -= 0.05;
      }
      // translate view backward
      if ("s" === event.key) {
        Eye[1] += 0.05;
        lookAt[1] += 0.05;
      }
      // translate view up
      if ("e" === event.key) {
        Eye[2] -= 0.05;
        lookAt[2] -= 0.05;
      }
      // translate view down
      if ("q" === event.key) {
        Eye[2] += 0.05;
        lookAt[2] += 0.05;
      }
      // rotate view right
      if ("A" === event.key) {
        vec3.rotateY(lookAt, lookAt, [Eye[0], Eye[1], Eye[2]], 0.05);
      }
      // rotate view left
      if ("D" === event.key) {
        vec3.rotateY(lookAt, lookAt, [Eye[0], Eye[1], Eye[2]], -0.05);
      }
      // rotate view forward
      if ("W" === event.key) {
        vec3.rotateX(lookAt, lookAt, [Eye[0], Eye[1], Eye[2]], -0.05);
      }
      // rotate view backward
      if ("S" === event.key) {
        vec3.rotateX(lookAt, lookAt, [Eye[0], Eye[1], Eye[2]], 0.05);
      }
      // select the next model
      if ("ArrowLeft" === event.key) {
        selectionID++;
        if (selectionID > ids[ids.length - 1]) {
          selectionID = ids[ids.length - 1];
        }
        if (selectionID != -1) {
          selectionScaleMatrix = mat4.create();
        }
      }
      // select the previous model
      if ("ArrowRight" === event.key) {
        selectionID--;
        if (selectionID <= -1) {
          selectionID = ids[0];
        }
        if (selectionID != -1 && !(selectionID > matrices.length)) {
          selectionScaleMatrix = mat4.create();

        } else {
          selectionScaleMatrix = mat4.create();
        }
      }
      // reset the selection
      if (" " === event.key) {
        selectionID = -1;
        selectionScaleMatrix = mat4.create();
      }
      // translate the selection left
      if ("k" === event.key) {
        if (selectionID != -1) {
          vec3.add(translationSets[selectionID], translationSets[selectionID], vec3.fromValues(-0.05, 0.0, 0.0));
        }
      }
      // translate the selection right
      if (";" === event.key) {
        if (selectionID != -1) {
          vec3.add(translationSets[selectionID], translationSets[selectionID], vec3.fromValues(0.05, 0.0, 0.0));
        }
      }
      // translate the selection up
      if ("i" === event.key) {
        if (selectionID != -1) {
          vec3.add(translationSets[selectionID], translationSets[selectionID], vec3.fromValues(0.0, 0.05, 0.0));
        }
      }
      // translate the selection down
      if ("p" === event.key) {
        if (selectionID != -1) {
          vec3.add(translationSets[selectionID], translationSets[selectionID], vec3.fromValues(0.0, -0.05, 0.0));
        }
      }
      // translate the seelction forward
      if ("o" === event.key) {
        if (selectionID != -1) {
          vec3.add(translationSets[selectionID], translationSets[selectionID], vec3.fromValues(0.0, 0.0, 0.05));
        }
      }
      // translate the selection backward
      if ("l" === event.key) {
        if (selectionID != -1) {
          vec3.add(translationSets[selectionID], translationSets[selectionID], vec3.fromValues(0.0, 0.0, -0.05));
        }
      }
      // rotate the seelction forward
      if ("O" === event.key) {
        if (selectionID != -1) {
          vec3.add(rotationSets[selectionID], rotationSets[selectionID], vec3.fromValues(-5 * Math.PI / 180, 0.0, 0.0));
        }
      }
      // rotate the selection backward
      if ("L" === event.key) {
        if (selectionID != -1) {
          vec3.add(rotationSets[selectionID], rotationSets[selectionID], vec3.fromValues(5 * Math.PI / 180, 0.0, 0.0));
        }
      }
      // rotate the selection clockwise
      if ("I" === event.key) {
        if (selectionID != -1) {
          vec3.add(rotationSets[selectionID], rotationSets[selectionID], vec3.fromValues(0.0, 0.0, 5 * Math.PI / 180));
        }
      }
      // rotate the selection counter clockwise
      if ("P" === event.key) {
        if (selectionID != -1) {
          vec3.add(rotationSets[selectionID], rotationSets[selectionID], vec3.fromValues(0.0, 0.0, -5 * Math.PI / 180));
        }
      }
      // rotate the selection left
      if ("K" === event.key) {
        if (selectionID != -1) {
          vec3.add(rotationSets[selectionID], rotationSets[selectionID], vec3.fromValues(0.0, 5 * Math.PI / 180, 0.0));
        }
      }
      // rotate the selection right
      if (":" === event.key) {
        if (selectionID != -1) {
          vec3.add(rotationSets[selectionID], rotationSets[selectionID], vec3.fromValues(0.0, -5 * Math.PI / 180, 0.0));
        }
      }

      // Set up our matrix array
      for (var whichSet = 0; whichSet < numTriangleSets; whichSet++) {
        // create each matrix in the array
        matrices[whichSet] = mat4.create();
        var temp = mat4.create();
        mat4.fromTranslation(temp, vec3.negate(vec3.create(), centerArray[whichSet])); // translate original center to origin
        mat4.multiply(temp,
          mat4.fromRotation(mat4.create(), rotationSets[whichSet][2], vec3.fromValues(0, 0, 1)),
          temp); // rotate Z
        mat4.multiply(temp,
          mat4.fromRotation(mat4.create(), rotationSets[whichSet][1], vec3.fromValues(0, 1, 0)),
          temp); // rotate Y
        mat4.multiply(temp,
          mat4.fromRotation(mat4.create(), rotationSets[whichSet][0], vec3.fromValues(1, 0, 0)),
          temp); // rotate X
        // scale the current selection
        if (selectionID == whichSet) {
          mat4.multiply(temp,
            mat4.fromScaling(mat4.create(), vec3.fromValues(1.2, 1.2, 1.2)),
            temp); // rotate 90 degs
        }
        mat4.multiply(temp,
          mat4.fromTranslation(mat4.create(), translationSets[whichSet]),
          temp); // move to new location

        mat4.multiply(matrices[whichSet], matrices[whichSet], temp);
      }

      var temp = [];
      for (var i = 0; i < ids.length; i++) {
        if (ids[i] == selectionID) {
          console.log("ids[i] " + ids[i]);
          console.log("selectionID " + selectionID);
          temp.push(i);

        }
      }
      console.log("Temp " + temp);
      console.log("Before Norm: " + normal);
      for (var i = 0; i < normal.length; i += 3) {
        var temp2 = vec3.fromValues(normal[temp[i]], normal[temp[i + 1]], normal[temp[i + 2]]);
        vec3.rotateY(temp2, temp2, vec3.fromValues(0.0, 0.0, 1.0),
          5 * Math.PI / 180);
        normal[temp[i]] = temp2[0];
        normal[temp[i + 1]] = temp2[1];
        normal[temp[i + 2]] = temp2[2];
      }
    }

    // send the triangle id buffer to webGL
    id_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, id_buffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ids), gl.STATIC_DRAW); // indices to that buffer

    // send the ambient light colors to webGL
    ambLight_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ambLight_buffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lightAmbient), gl.STATIC_DRAW); // indices to that buffer

    // send the diffuse light colors to webGL
    diffLight_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, diffLight_buffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lightDiffuse), gl.STATIC_DRAW); // indices to that buffer

    // send the specular light colors to webGL
    specLight_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, specLight_buffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lightSpecular), gl.STATIC_DRAW); // indices to that buffer

    // send the light coordinates to webGL
    lightCoords_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lightCoords_buffer); // activate that buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lightCoords), gl.STATIC_DRAW); // indices to that buffer


  } // end if triangles found
} // end load triangles

// setup the webGL shaders
function setupShaders() {

  // define fragment shader in essl using es6 template strings
  var fShaderCode = `
        precision mediump float;
        varying vec3 L, N, E, vAmb, vDiff, vSpec, vNormal;
        varying float vReflect;
        uniform vec3 La, Ld, Ls, LPos;
        void main(void) {
          vec3 ambientC = vAmb * La ;
          vec3 diffuseC = max(dot(L, N), 0.0) * (vDiff * Ld);
          vec3 H = normalize(L + E);
          vec3 specularC = pow(max(dot(N, H), 0.0), vReflect) * (vSpec * Ls);
          if (dot(L, N) < 0.0) {
            specularC = vec3(0.0, 0.0, 0.0);
          }
          vec3 color = ambientC + diffuseC + specularC;
          gl_FragColor = vec4(color, 1.0);
        }
    `;

  // define vertex shader in essl using es6 template strings
  var vShaderCode = `
        uniform bool altPosition;
        uniform vec3 La, Ld, Ls, LPos, eye;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix, selectionScale;
        uniform float sID;
        attribute vec3 vertexPosition, tAmbient, tDiffuse, tSpecular, tNormal;
        attribute float tReflect, tID; // vertex reflectivity coefficient, vertexId
        varying vec3 L, N, E, vAmb, vDiff, vSpec, vNormal;
        uniform mat4 MmatrixArray[20];
        uniform mat4 NmatrixArray[20];
        varying float vReflect;
        void main(void) {
                      mat4 mPosition;
                      vec4 vPosition;
                      if (sID == tID) {
                        mPosition = (Pmatrix * (Vmatrix * (MmatrixArray[int(sID)] * selectionScale)));
                      } else {
                        mPosition = (Pmatrix * (Vmatrix * MmatrixArray[int(tID)]));
                      }

                      vec4 nVec = vec4(1, 1, 1, 0);
                      vec4 mvPosition = (mPosition * vec4(vertexPosition, 1.0));
                      gl_Position = mvPosition;
                      if (sID == tID ) {
                        nVec = NmatrixArray[int(sID)] * vec4(tNormal, 1.0);
                        vPosition = MmatrixArray[int(sID)] * vec4(vertexPosition, 1.0);
                      } else {
                        nVec = NmatrixArray[int(tID)] * vec4(tNormal, 1.0);
                        vPosition = MmatrixArray[int(tID)] * vec4(vertexPosition, 1.0);
                      }
                      L = normalize(LPos - vec3(vPosition));
                      N = -normalize(vec3(nVec));
                      E = normalize(eye - vec3(vPosition));
                      vAmb = tAmbient;
                      vDiff = tDiffuse;
                      vSpec = tSpecular;
                      vNormal = tNormal;
                      vReflect = tReflect;
        }
    `;

  try {
    var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
    gl.shaderSource(fShader, fShaderCode); // attach code to shader
    gl.compileShader(fShader); // compile the code for gpu execution

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
        vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition"); // get pointer to vertex position shader input
        tAmbient = gl.getAttribLocation(shaderProgram, "tAmbient"); // get pointer to ambient shader input
        tDiffuse = gl.getAttribLocation(shaderProgram, "tDiffuse"); // get pointer to diffuse shader input
        tSpecular = gl.getAttribLocation(shaderProgram, "tSpecular"); // get pointer to specular shader input
        tNormal = gl.getAttribLocation(shaderProgram, "tNormal"); // get pointer to vertex normal shader input
        tReflect = gl.getAttribLocation(shaderProgram, "tReflect"); // get pointer to reflectivity coefficient
        tID = gl.getAttribLocation(shaderProgram, "tID");
        tcenters = gl.getAttribLocation(shaderProgram, "tcenters");
        gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array
        gl.enableVertexAttribArray(tAmbient); // input to shader from ambient color array
        gl.enableVertexAttribArray(tDiffuse); // input to shader from diffuse color array
        gl.enableVertexAttribArray(tSpecular); // input to shader from specular color array
        gl.enableVertexAttribArray(tNormal); // input to shader from the normal array
        gl.enableVertexAttribArray(tReflect); // input to shader from the normal array
        gl.enableVertexAttribArray(tID); // input to shader from id array
        altPositionUniform = gl.getUniformLocation(shaderProgram, "altPosition"); // get pointer to altPosition flag
        La = gl.getUniformLocation(shaderProgram, "La"); // get pointer to ambient light uniform
        Ld = gl.getUniformLocation(shaderProgram, "Ls"); // get pointer to diffuse light uniform
        Ls = gl.getUniformLocation(shaderProgram, "Ld"); // get pointer to specular light uniform
        LPos = gl.getUniformLocation(shaderProgram, "LPos") // get pointer to light position uniform
        Pmatrix = gl.getUniformLocation(shaderProgram, "Pmatrix"); // get pointer to projection matrix
        Vmatrix = gl.getUniformLocation(shaderProgram, "Vmatrix"); // get pointer to view matrix
        Mmatrix = gl.getUniformLocation(shaderProgram, "Mmatrix"); // get pointer to model matrix
        for (var whichSet = 0; whichSet < numTriangleSets; whichSet++) {
          temp = "MmatrixArray[" + whichSet + "]";
          MmatrixArray[whichSet] = gl.getUniformLocation(shaderProgram, temp); // set up each model in the model matrix array
          tempM3 = "NmatrixArray[" + whichSet + "]";
          NmatrixArray[whichSet] = gl.getUniformLocation(shaderProgram, tempM3); // set up each normal in the normal matrix array
        }
        eye = gl.getUniformLocation(shaderProgram, "eye");
        selectionScale = gl.getUniformLocation(shaderProgram, "selectionScale");
        sID = gl.getUniformLocation(shaderProgram, "sID");
      } // end if no shader program link errors
    } // end if no compile errors
  } // end try
  catch (e) {
    console.log(e);
  } // end catch
} // end setup shaders
var bgColor = 0;
// render the loaded model
function renderTriangles() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
  // bgColor = (bgColor < 1) ? (bgColor + 0.001) : 0;
  gl.clearColor(bgColor, 0.0, 0.1, 1.0);
  requestAnimationFrame(renderTriangles);
  var tempVerticies = [];
  // vertex buffer: activate and feed into vertex shader
  gl.uniform1i(altPositionUniform, altPosition); // feed
  // send the projection matrix
  gl.uniformMatrix4fv(Pmatrix, false, proj_matrix);
  // send the view matrix
  gl.uniformMatrix4fv(Vmatrix, false, view_matrix);
  // create our look at vector
  mat4.lookAt(view_matrix, vec3.fromValues(Eye[0], Eye[1], Eye[2]), lookAt, lookUp);
  // id buffer: activate and feed to vertex shader
  gl.bindBuffer(gl.ARRAY_BUFFER, id_buffer);
  gl.vertexAttribPointer(tID, 1, gl.FLOAT, false, 0, 0);

  // set up each triangle with associated values
  for (var whichTriSet = 0; whichTriSet < numTriangleSets; whichTriSet++) {
    gl.uniformMatrix4fv(Mmatrix, false, matrices[whichTriSet]);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer[whichTriSet]); // activate
    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer[whichTriSet]); // activate
    gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0); // feed

    // ambient color buffer: activate and feed to vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER, amb_buffer[whichTriSet]);
    gl.vertexAttribPointer(tAmbient, 3, gl.FLOAT, false, 0, 0);

    // diffuse color buffer: activate and feed to vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER, diff_buffer[whichTriSet]);
    gl.vertexAttribPointer(tDiffuse, 3, gl.FLOAT, false, 0, 0);

    // diffuse color buffer: activate and feed to vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER, spec_buffer[whichTriSet]);
    gl.vertexAttribPointer(tSpecular, 3, gl.FLOAT, false, 0, 0);

    // normal buffer: activate and feed to vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer[whichTriSet]);
    gl.vertexAttribPointer(tNormal, 3, gl.FLOAT, false, 0, 0);
    // reflectivity buffer: activate and feed to vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER, reflectBuffer[whichTriSet]);
    gl.vertexAttribPointer(tReflect, 3, gl.FLOAT, false, 0, 0);
  }
  // calculate the normal matrix and send the model matrix for each triangle
  for (var whichSet = 0; whichSet < numTriangleSets; whichSet++) {
    tempM = matrices[whichSet];
    var tempM2 = mat4.create();
    mat4.multiply(tempM2, view_matrix, tempM);
    //mat4.multiply(tempM2, proj_matrix, tempM2);
    mInvert = mat4.invert(mat4.create(), tempM2);
    mTranspose = mat4.transpose(mat4.create(), mInvert);
    gl.uniformMatrix4fv(NmatrixArray[whichSet], false, mTranspose);
    gl.uniformMatrix4fv(MmatrixArray[whichSet], false, matrices[whichSet]);
  }

  // Send in the light uniforms
  gl.uniform3fv(La, lightAmbient);
  gl.uniform3fv(Ld, lightDiffuse);
  gl.uniform3fv(Ls, lightSpecular);
  gl.uniform3fv(LPos, lightCoords);
  // a 20% scale up applied to each "selected" vertex
  gl.uniformMatrix4fv(selectionScale, false, selectionScaleMatrix);
  gl.uniform3fv(eye, vec3.fromValues(Eye[0], Eye[1], Eye[2]));
  gl.uniform1f(sID, selectionID);
  gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0); // render

} // end render triangles


/* MAIN -- HERE is where execution begins after window load */
function main() {
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
} // end main

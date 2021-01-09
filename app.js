"use strict";

let noiseSize = 24;
let chunks = 8;
let wavelength = 8;
let octaves = 3;
let yScrollSpeed = 18;
let shaderBrightness = 0.2;
let shaderR = 1.0;
let shaderG = 0.3;
let shaderB = 0.7;

let context = new (window.AudioContext || window.webkitAudioContext)();
let analyser = context.createAnalyser();
analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 0.8;
let micInput = null;

var vertexShader = `
attribute vec4 a_position;

uniform mat4 MVP;
uniform float drawCol;

varying float fragmentColor;
varying float zPos;
varying float yPos;

void main() {
	// Output position of the vertex, in clip space : MVP * position
	gl_Position = MVP * a_position;
	fragmentColor = drawCol;
    zPos = a_position.y;
    yPos = a_position.z;
}
`;

var fragmentShader = `
precision mediump float;

varying float fragmentColor;
varying float zPos;
varying float yPos;

uniform float rAmt;
uniform float gAmt;
uniform float bAmt;
uniform float cameraY;

void main() {
    float colAmount = fragmentColor + 0.13 * zPos;
    float alpha = colAmount * pow( 1.0 - 0.0084 * (yPos - cameraY), 2.0);
	gl_FragColor = vec4(colAmount * rAmt, colAmount * gAmt, colAmount * bAmt, alpha);
}
`;

class PIDController {
    constructor() {
        this.value = 0;
        this.target = 0;
        this.err = 0;
        this.errTotal = 0;
        this.errLast = 0;
    }

    step() {
        this.err = this.target - this.value;
        this.errTotal += this.err;
        let p = 0.16 * this.err; // 0.16
        let i = 0.16 * this.errTotal; // 0.12
        let d = 0.08 * (this.err - this.errLast); // 0.08
        this.errLast = this.err;
        this.errTotal *= 0.8;
        this.value += p + i + d;
    }
}

function AverageBinsNormalized(array, start, end) {
    let avg = 0;
    for(let i = start; i <= end; i++) {
        avg += array[i];
    }
    avg /= end - start + 1;
    return avg / 255;
}

navigator.getUserMedia = (navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);

function main() {
    // set up webgl
    let canvas = document.querySelector("#canvas");
    let gl = canvas.getContext("webgl");
    if (!gl) {
        alert("Unable to start WebGL. It may be unsupported by your browser or machine.");
        return;
    }

    // get microphone
    navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
        micInput = context.createMediaStreamSource(stream);
        micInput.connect(analyser);
    }).catch(function(e) {
        console.error("Error getting microphone", e);
        alert("Couldn't get microphone!");
    });
    let binCount = analyser.frequencyBinCount;
    let binArray = new Uint8Array(binCount);

    // set up points
    let pidLo = new PIDController();
    let pidMd = new PIDController();
    let pidHi = new PIDController();
    let noise1 = new Float32Array(noiseSize * noiseSize * chunks);
    let noise2 = new Float32Array(noiseSize * noiseSize * chunks);
    let noise3 = new Float32Array(noiseSize * noiseSize * chunks);

    let yOffset = 0;
    let ySteps = 0;

    let peaksArray = new Float32Array(noiseSize);
    for (let i = 0; i < noiseSize; i++) {
        peaksArray[i] = 1.0 + Math.sin(Math.PI * i / (noiseSize - 1) * 3) - Math.cos(Math.PI * i / (noiseSize - 1) * 2) - Math.sin(Math.PI * i / (noiseSize - 1));
    }

    noise.seed(Math.random());
    let index = 0;
    for (let k = 0; k < chunks; k++) {
        let koffset = k * (noiseSize - 1);
        for (let i = 0; i < noiseSize; i++) {
            for (let j = 0; j < noiseSize; j++) {
                noise1[index] = noise.perlin2((i + koffset) / wavelength, j / wavelength);
                noise2[index] = noise.perlin2(2 * (i + koffset) / wavelength, 2 * j / wavelength);
                noise3[index] = noise.perlin2(4 * (i + koffset) / wavelength, 4 * j / wavelength);
                index++;
            }
        }
    }

    // start webgl program
    let program = webglUtils.createProgramFromSources(gl, [vertexShader, fragmentShader]);

    let positionLocation = gl.getAttribLocation(program, "a_position");

    // uniforms
    let uMVP = gl.getUniformLocation(program, "MVP");
    let uDrawCol = gl.getUniformLocation(program, "drawCol");
    let uRAmt = gl.getUniformLocation(program, "rAmt");
    let uGAmt = gl.getUniformLocation(program, "gAmt");
    let uBAmt = gl.getUniformLocation(program, "bAmt");
    let uCameraY = gl.getUniformLocation(program, "cameraY");

    // init vertices
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    let vertexBufferData = new Float32Array(noiseSize * noiseSize * 3 * chunks);
    index = 0;
    for (let k = 0; k < chunks; k++) {
        let koffset = k * (noiseSize - 1);
        for (let j = 0; j < noiseSize; j++) {
            for (let i = 0; i < noiseSize; i++) {
                vertexBufferData[index] = i - noiseSize / 2;
                index++;
                vertexBufferData[index] = 0;
                index++;
                vertexBufferData[index] = j - noiseSize / 2 + koffset;
                index++;
            }
        }
    }
    gl.bufferData(gl.ARRAY_BUFFER, vertexBufferData, gl.DYNAMIC_DRAW);
    
    // init indices
    let indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    let indices = new Uint16Array((noiseSize - 1) * (noiseSize - 1) * 6 * chunks);
    index = 0;
    for (let k = 0; k < chunks; k++) {
        let koffset = noiseSize * noiseSize * k;
        for (let j = 0; j < noiseSize - 1; j++) {
            let joffset = noiseSize * j;
            for (let i = 0; i < noiseSize - 1; i++) {
                let N = i + joffset + koffset;
                indices[index] = N;
                index++;
                indices[index] = N + 1;
                index++;
                indices[index] = N + noiseSize;
                index++;
                indices[index] = N + 1;
                index++;
                indices[index] = N + noiseSize;
                index++;
                indices[index] = N + noiseSize + 1;
                index++;
            }
        }
    }
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // camera settings
    let position = [0, -2, yOffset];
    let rotation = [Math.PI, 0, Math.PI];
    let FoV = 100;

    requestAnimationFrame(drawScene);

    let then = 0;
    function drawScene(now) {
        now *= 0.001;
        let deltaTime = now - then;
        then = now;

        // update audio levels
        if (micInput != null) {
            analyser.getByteFrequencyData(binArray);
            pidLo.target = 0.2 * pidLo.value + 0.8 * Math.max(AverageBinsNormalized(binArray, 1, 8) - 0.5, 0.0);
            pidMd.target = 0.7 * pidMd.target + 0.3 * AverageBinsNormalized(binArray, 10, 100);
            pidHi.target = 0.7 * pidHi.target + 0.3 * AverageBinsNormalized(binArray, 200, 800);
        }

        // reset view
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        // gl settings
        gl.lineWidth(2.0);
        gl.clearColor(0.05, 0.0, 0.15, 1.0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        //gl.enable(gl.DEPTH_TEST);
        //gl.depthFunc(gl.LESS);
        // gl.enable(gl.CULL_FACE);
        
        // update position
        yOffset += yScrollSpeed * deltaTime;
        if (yOffset > (ySteps + 1) * (noiseSize - 1)) {
            // load a new chunk
            let arrayPos = ySteps % chunks;
            let zOrigin = (ySteps + chunks) * (noiseSize - 1);
            index = 2 + arrayPos * noiseSize * noiseSize * 3;
            for (let j = 0; j < noiseSize; j++) {
                for (let i = 0; i < noiseSize; i++) {
                    vertexBufferData[index] = j - noiseSize / 2 + zOrigin;
                    index += 3;
                }
            }
            for (let i = 0; i < noiseSize; i++) {
                for (let j = 0; j < noiseSize; j++) {
                    index = j + i * noiseSize + arrayPos * noiseSize * noiseSize;
                    noise1[index] = noise.perlin2((i + zOrigin) / wavelength, j / wavelength);
                    noise2[index] = noise.perlin2(2 * (i + zOrigin) / wavelength, 2 * j / wavelength);
                    noise3[index] = noise.perlin2(4 * (i + zOrigin) / wavelength, 4 * j / wavelength);
                }
            }
            ySteps++;
        }

        // update mountain heights
        let ind = 1;
        pidLo.step();
        pidMd.step();
        pidHi.step();
        for (let k = 0; k < chunks; k++) {
            let koffset = k * noiseSize * noiseSize;
            for (let j = 0; j < noiseSize; j++) {
                let joffset = j * noiseSize;
                for (let i = 0; i < noiseSize; i++) {
                    let iscale = peaksArray[i];
                    vertexBufferData[ind] = iscale * (
                        15.0 * pidLo.value * (noise1[i + joffset + koffset] + 0.5) +
                        5.0 * pidMd.value * noise2[i + joffset + koffset] +
                        3.0 * pidHi.value * noise3[i + joffset + koffset]
                    );
                    ind += 3;
                }
            }
        }
        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        let size = 3;
        let type = gl.FLOAT;
        let normalize = false;
        let stride = 0;
        let offset = 0;
        gl.vertexAttribPointer(positionLocation, size, type, normalize, stride, offset);

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexBufferData);
        
        // index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        // camera
        let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        let matrix = m4.perspective(degToRad(FoV), aspect, 0.01, 120) // draw distance 120
        matrix = m4.xRotate(matrix, rotation[0]);
        matrix = m4.yRotate(matrix, rotation[1]);
        matrix = m4.zRotate(matrix, rotation[2]);
        matrix = m4.translate(matrix, position[0], position[1], -yOffset);
        gl.uniformMatrix4fv(uMVP, false, matrix);

        // uniforms
        gl.uniform1f(uDrawCol, shaderBrightness);
        gl.uniform1f(uRAmt, shaderR);
        gl.uniform1f(uGAmt, shaderG);
        gl.uniform1f(uBAmt, shaderB);
        gl.uniform1f(uCameraY, yOffset);

        // draw
        let primitiveType = gl.TRIANGLES;
        offset = 0;
        let count = indices.length;
        let indexType = gl.UNSIGNED_SHORT;
        gl.drawElements(primitiveType, count, indexType, offset);

        gl.uniform1f(uDrawCol, shaderBrightness + 0.3);
        primitiveType = gl.LINES; // or LINE_STRIP
        offset = 0;
        count = indices.length;
        indexType = gl.UNSIGNED_SHORT;
        gl.drawElements(primitiveType, count, indexType, offset);

        requestAnimationFrame(drawScene);
    }

    function degToRad(d) {
        return d * Math.PI / 180;
    }
}

main();
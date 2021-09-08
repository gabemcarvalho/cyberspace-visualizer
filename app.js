"use strict";

const noiseSize = 24;
const chunks = 8;
const wavelength = 8;
const octaves = 3;

let context = new (window.AudioContext || window.webkitAudioContext)();
let analyser = context.createAnalyser();
analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 0.8;
let micInput = null;

var vertexShader = `
attribute vec4 a_position;

uniform mat4 MVP;

uniform vec3 vMainCol;
uniform vec3 vBackCol;

uniform float brightness;
uniform float fogDist;
uniform float cameraY;
uniform float baseAlpha; // assume 0.0 for additive blend mode, 1.0 for normal blend mode

varying vec4 vertCol;

void main() {
	gl_Position = MVP * a_position;
	
    float zPosBrightness = brightness + 0.13 * a_position.y;
    float fogAmt = sqrt(clamp((a_position.z - cameraY) / fogDist, 0.0, 1.0));
    float alpha = baseAlpha + zPosBrightness * (1.0 - (1.0 - baseAlpha) * fogAmt);
    
    fogAmt *= baseAlpha; // don't want background colour mix when additive blending
    vertCol = vec4((1.0 - fogAmt) * zPosBrightness * vMainCol + fogAmt * vBackCol, alpha);
}
`;

var fragmentShader = `
precision mediump float;

varying vec4 vertCol;

void main() {
	gl_FragColor = vertCol;
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
        let p = 0.16 * this.err;
        let i = 0.16 * this.errTotal;
        let d = 0.08 * (this.err - this.errLast);
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
        micInput.connect(analyser); // note: need to put this in a button to comply with regulation
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
    let uBrightness = gl.getUniformLocation(program, "brightness");
    let uMainCol = gl.getUniformLocation(program, "vMainCol");
    let uBackCol = gl.getUniformLocation(program, "vBackCol");
    let uCameraY = gl.getUniformLocation(program, "cameraY");
    let uBaseAlpha = gl.getUniformLocation(program, "baseAlpha");
    let uFogDist = gl.getUniformLocation(program, "fogDist");

    // init vertices
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    let vertexBufferData = new Float32Array(noiseSize * noiseSize * 3 * chunks);
    index = 0;
    for (let k = 0; k < chunks; k++) {
        let koffset = k * (noiseSize - 1);
        for (let j = 0; j < noiseSize; j++) {
            for (let i = 0; i < noiseSize; i++) {
                vertexBufferData[index] = i - noiseSize / 2 + 0.5;
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

    requestAnimationFrame(drawScene);

    let then = 0;
    function drawScene(now) {
        now *= 0.001;
        let deltaTime = now - then;
        then = now;

        // camera settings
        let position = [0, -height, yOffset];
        let rotation = [Math.PI, 0, Math.PI];

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
        gl.clearColor(backR, backG, backB, 1.0);
        gl.enable(gl.BLEND);
        
        if (blendMode == 0) {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive blending
            gl.disable(gl.DEPTH_TEST);
            baseAlpha = 0.0;
        } else if (blendMode == 1)
        {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // normal blending
            gl.enable(gl.DEPTH_TEST); // discards fragments that fail depth test
            gl.depthFunc(gl.LESS);
            //gl.enable(gl.CULL_FACE); // need to calculate normals for this to work
            baseAlpha = 1.0;
        }
        
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
                        15.0 * (baseLo + pidLo.value * sensitivityLo) * (noise1[i + joffset + koffset] + 0.5) +
                        5.0 * (baseMd + pidMd.value * sensitivityMd) * noise2[i + joffset + koffset] +
                        3.0 * (baseHi + pidHi.value * sensitivityHi) * noise3[i + joffset + koffset]
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
        gl.uniform1f(uBrightness, shaderBrightness);
        gl.uniform3f(uMainCol, shaderR, shaderG, shaderB);
        gl.uniform3f(uBackCol, backR, backG, backB);
        gl.uniform1f(uCameraY, yOffset);
        gl.uniform1f(uBaseAlpha, baseAlpha);
        gl.uniform1f(uFogDist, fogDist);

        // draw
        if (drawTriangles) {
            let primitiveType = gl.TRIANGLES;
            offset = 0;
            let count = indices.length;
            let indexType = gl.UNSIGNED_SHORT;
            gl.drawElements(primitiveType, count, indexType, offset);
        }
        
        if (drawLines) {
            gl.uniform1f(uBrightness, Math.min(shaderBrightness + 0.3, 1.0));
            let primitiveType = gl.LINES; // LINES or LINE_STRIP
            offset = 0;
            let count = indices.length;
            let indexType = gl.UNSIGNED_SHORT;
            gl.drawElements(primitiveType, count, indexType, offset);
        }

        requestAnimationFrame(drawScene);
    }

    function degToRad(d) {
        return d * Math.PI / 180;
    }
}

main();
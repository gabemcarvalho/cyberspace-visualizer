let idleTimer = null;
let isIdle = false;
let settingsAreOpen = false;

function showHeader(time) {
    clearTimeout(idleTimer);

    if (isIdle) {
        document.getElementById("header").classList.remove("inactive");
        document.getElementById("settings-icon").classList.remove("inactive");
    }

    isIdle = false;
    idleTimer = setTimeout(function() {
        if (!settingsAreOpen) {
            document.getElementById("header").classList.add("inactive");
            document.getElementById("settings-icon").classList.add("inactive");
            isIdle = true;
        }
    }, time);
}

showHeader(2000);

window.addEventListener('mousemove', e => {
    showHeader(2000);
});

const settingsPosVariable = '--settings-pane-left';

document.getElementById("settings-btn").addEventListener('click', e => {
    settingsAreOpen = !settingsAreOpen;
    
    if (settingsAreOpen)
    {
        document.documentElement.style.setProperty(settingsPosVariable, '0px');
    } else {
        document.documentElement.style.setProperty(settingsPosVariable, '-700px');
    }
});

function RedSlider() {
    let percent = this.value / this.max * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, red '+ percent +'%, #000 ' + percent + '%, #000 100%)';

    this.oninput = function() {
        let percent = this.value / this.max * 100;
        this.style.background = 'linear-gradient(to right, #000 0%, red '+ percent +'%, #000 ' + percent + '%, #000 100%)'
    };
};

// Global variables
var FoV = 100;
var height = 2;
var yScrollSpeed = 4;
var shaderBrightness = 0.2;
var fogDist = 100;

var shaderR = 1.0;
var shaderG = 0.3;
var shaderB = 0.7;
var backR = 0.05;
var backG = 0.0;
var backB = 0.15;

var baseLo = 0.0;
var baseMd = 0.3;
var baseHi = 0.4;
var sensitivityLo = 1.0;
var sensitivityMd = 1.0;
var sensitivityHi = 1.0;

var blendMode = 0;
let baseAlpha = 0.0;
var drawTriangles = true;
var drawLines = true;

let e = document.getElementById("meshR");
e.oninput = function() {
    shaderR = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #f00 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("meshG");
e.oninput = function() {
    shaderG = parseFloat(this.value);
    let percent = this.value / this.max * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #0f0 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("meshB");
e.oninput = function() {
    shaderB = parseFloat(this.value);
    let percent = this.value / this.max * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #00f '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("backR");
e.oninput = function() {
    backR = parseFloat(this.value);
    let percent = this.value / this.max * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #f00 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("backG");
e.oninput = function() {
    backG = parseFloat(this.value);
    let percent = this.value / this.max * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #0f0 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("backB");
e.oninput = function() {
    backB = parseFloat(this.value);
    let percent = this.value / this.max * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #00f '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

document.getElementById("blendmode").addEventListener('click', function(e) {
    if (this.checked) {
        blendMode = 1;
    } else {
        blendMode = 0;
    }
});

document.getElementById("drawTriangles").addEventListener('click', function(e) {
    drawTriangles = this.checked;
});

document.getElementById("drawLines").addEventListener('click', function(e) {
    drawLines = this.checked;
});

e = document.getElementById("brightness");
e.oninput = function() {
    shaderBrightness = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("speed");
e.oninput = function() {
    yScrollSpeed = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("FoV");
e.oninput = function() {
    FoV = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("height");
e.oninput = function() {
    height = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("fogDist");
e.oninput = function() {
    fogDist = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("baseLo");
e.oninput = function() {
    baseLo = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("baseMd");
e.oninput = function() {
    baseMd = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("baseHi");
e.oninput = function() {
    baseHi = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("sensitivityLo");
e.oninput = function() {
    sensitivityLo = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("sensitivityMd");
e.oninput = function() {
    sensitivityMd = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

e = document.getElementById("sensitivityHi");
e.oninput = function() {
    sensitivityHi = parseFloat(this.value);
    let percent = (this.value - this.min) / (this.max - this.min) * 100;
    this.style.background = 'linear-gradient(to right, #000 0%, #d3d3d3 '+ percent +'%, #000 ' + percent + '%, #000 100%)';
};
e.oninput();

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

document.getElementById("meshR").oninput = function() {
    shaderR = parseFloat(this.value);
};

document.getElementById("meshG").oninput = function() {
    shaderG = parseFloat(this.value);
};

document.getElementById("meshB").oninput = function() {
    shaderB = parseFloat(this.value);
};

document.getElementById("backR").oninput = function() {
    backR = parseFloat(this.value);
};

document.getElementById("backG").oninput = function() {
    backG = parseFloat(this.value);
};

document.getElementById("backB").oninput = function() {
    backB = parseFloat(this.value);
};

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

document.getElementById("brightness").oninput = function() {
    shaderBrightness = parseFloat(this.value);
};

document.getElementById("speed").oninput = function() {
    yScrollSpeed = parseFloat(this.value);
};

document.getElementById("FoV").oninput = function() {
    FoV = parseFloat(this.value);
};

document.getElementById("height").oninput = function() {
    height = parseFloat(this.value);
};

document.getElementById("fogDist").oninput = function() {
    fogDist = parseFloat(this.value);
};

document.getElementById("baseLo").oninput = function() {
    baseLo = parseFloat(this.value);
};

document.getElementById("baseMd").oninput = function() {
    baseMd = parseFloat(this.value);
};

document.getElementById("baseHi").oninput = function() {
    baseHi = parseFloat(this.value);
};

document.getElementById("sensitivityLo").oninput = function() {
    sensitivityLo = parseFloat(this.value);
};

document.getElementById("sensitivityMd").oninput = function() {
    sensitivityMd = parseFloat(this.value);
};

document.getElementById("sensitivityHi").oninput = function() {
    sensitivityHi = parseFloat(this.value);
};
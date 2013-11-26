"use strict";

function Light(color) {
    this.enabled = false;
    this.color = color;
}

var lightArray = [
    new Light("White"),
    new Light("rgb(28, 184, 65)"),
    new Light("rgb(202, 60, 60)"),
    new Light("rgb(223, 117, 20)"),
    new Light("rgb(66, 184, 221)"),
    new Light("rgb(28, 184, 65)"),
    new Light("rgb(202, 60, 60)"),
    new Light("White")
];

var keyMap = {
    "q": 0,
    "w": 0,
    "e": 0,
    "r": 0,
    "t": 0,
    "y": 0,
    "a": 1,
    "s": 2,
    "d": 3,
    "f": 4,
    "g": 5,
    "h": 6,
    " ": 7
};

function setLightStateFromBitField(bitfield) {
    for (var i = 0; i < lightArray.length; i++) {
        lightArray[i].enabled = bitfield & 1;
        bitfield >>= 1;
    }
}

var disabledColor = 'Gray'
function showLightStatus() {
    for (var i = 0; i < lightArray.length; i++) {
        var element = document.getElementById('toggle' + i);
        element.style.background = lightArray[i].enabled ? lightArray[i].color : disabledColor;
    }
}

var serverName = 'http://' + location.host
var socket = io.connect(serverName);
socket.on('server update', function(data) {
    setLightStateFromBitField(data);
    showLightStatus();
});

function clicked(index) {
    toggleLight(index);
}

function toggleLight(index) {
    if (lightArray[index].enabled)
        socket.emit('light disable', index);
    else
        socket.emit('light enable', index);
}

/* Set up all the dots below the buttons so that they're colors match
 * the button colors. */
function setDotColors() {
    for (var i = 0; i < lightArray.length; i++) {
	var dot = document.getElementById('color' + i);
	dot.style.background = lightArray[i].color;
    }
}

window.onload = function() {
    setDotColors();

    var banner = document.getElementById('lights-banner');
    var parallaxSpeed = 0.5;
    window.onscroll = function(e) {
	if (window.innerWidth >= 1024)
            banner.style.backgroundPosition = '0px ' + (-parallaxSpeed * window.pageYOffset) + 'px';
    }

    document.onkeypress = function(event) {
	var index = keyMap[String.fromCharCode(event.charCode).toLowerCase()];
	toggleLight(index);
    }
}


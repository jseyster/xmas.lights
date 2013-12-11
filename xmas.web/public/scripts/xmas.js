/* Copyright (c) 2013, Justin Seyster
   All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

   1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above
   copyright notice, this list of conditions and the following
   disclaimer in the documentation and/or other materials provided
   with the distribution.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
   FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
   COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
   INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
   (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
   HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
   STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
   OF THE POSSIBILITY OF SUCH DAMAGE. */

"use strict";

var socket;

function Light(color) {
    this.enabled = false;
    this.color = color;
}

var lightArray = [
    new Light("White"),
    new Light("rgb(66, 184, 221)"),
    new Light("rgb(28, 184, 65)"),
    new Light("rgb(202, 60, 60)"),
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

	// Make sure we don't end up with white text on a white background.
	if (lightArray[i].enabled && lightArray[i].color == 'White')
	    element.style.color = 'Gray';
	else
	    element.style.color = 'White';
    }
}

function clicked(index) {
    toggleLight(index);
}

function toggleLight(index) {
    if (lightArray[index].enabled)
        socket.emit('light disable', index);
    else
        socket.emit('light enable', index);
}

function setLight(index, val) {
    socket.emit(val ? 'light enable' : 'light disable', index);
}

function disableAll() {
    socket.emit('disable all');
}

/* Set up all the dots below the buttons so that they're colors match
 * the button colors. */
function setDotColors() {
    for (var i = 0; i < lightArray.length; i++) {
	var dot = document.getElementById('color' + i);
	dot.style.background = lightArray[i].color;

	dot = document.getElementById('seq-color' + i);
	dot.style.background = lightArray[i].color;
    }
}

function hideLightControls() {
    var controls = document.getElementById('light-controls');
    controls.innerHTML = '<h1 class="splash-head">Sorry, the lights are not available right now</h1>' +
	'<p>Usually, you can control them in the evenings, from 7:00p.m. to 1:00a.m. Pacific time.</p>';
}

window.onload = function() {
    writeSequencer(document.getElementById('sequencer-container'), lightArray);

    setDotColors();

    var banner = document.getElementById('lights-banner');
    var parallaxSpeed = 0.5;
    window.onscroll = function(e) {
	if (window.innerWidth >= 1024)
            banner.style.backgroundPosition = '0px ' + (-parallaxSpeed * window.pageYOffset) + 'px';
    }

    var serverName = 'http://' + location.host
    socket = io.connect(serverName, { 'connect timeout': 5000});
    socket.on('server update', function(data) {
	setLightStateFromBitField(data);
	showLightStatus();
    });

    socket.on('connect', function() {
	socket.on('disconnect', function() {
	    hideLightControls();
	});
    });

    socket.on('connect_failed', function() {
	hideLightControls();
    });

    socket.on('error', function() {
	hideLightControls();
    });

    document.onkeypress = function(event) {
	var index = keyMap[String.fromCharCode(event.charCode).toLowerCase()];
	toggleLight(index);
    }
}


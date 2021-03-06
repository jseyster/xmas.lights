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

var express = require('express');
var http = require('http');
var socketio = require('socket.io');

var sequence = require('./sequence.json');

/* After a light turns on, it cannot turn on again until after this
 * delay passes. The delay servers as a rate limit, preventing the
 * light from turning on and off many times a second. */
var LIGHT_ON_DELAY = 500;

/* After IDLE_TIMEOUT milliseconds with no commands sent to the
 * server, we enter a default idle sequence so that people have
 * lights to watch! */
var IDLE_TIMEOUT = 30000

var lastCommandTime = new Date();
var inIdle = false;

function Light() {
    this.enabled = false;
    this.lastLit = 0;
}

function buildLightArray(numLights) {
    var outArray = new Array();
    for (var i = 0; i < numLights; i++)
	outArray.push(new Light());

    return outArray;
}

var lightArray = buildLightArray(8);

function disableLight(light) {
    light.enabled = false;
}

function enableLight(light) {
    var now = new Date();
    if (now.getTime() >= light.lastLit + LIGHT_ON_DELAY) {
	light.enabled = true;
	light.lastLit = now.getTime();
    }
}

function disableAll() {
    for (var i = 0; i < lightArray.length; i++)
	lightArray[i].enabled = false;
}

function lightStateBitField() {
    var bitfield = 0;
    for (var i = lightArray.length - 1; i >= 0; i--) {
	bitfield <<= 1;
	bitfield |= lightArray[i].enabled ? 1 : 0;
    }

    return  bitfield;
}

var app = express();
var server = http.createServer(app);
var io = socketio.listen(server);
var port = process.env.PORT || 8080;
server.listen(port);

app.use(express.static(__dirname + '/public'));

function updateClients(socket) {
    var bitfield = lightStateBitField();
    socket.emit('server update', bitfield);
    socket.broadcast.emit('server update', bitfield);
}

io.sockets.on('connection', function(socket) {
    if (typeof(process.env.DISABLE_SOCKET) === 'undefined') {
	socket.emit('server update', lightStateBitField());

	socket.on('light enable', function(data) {
	    if (data >= 0 && data < lightArray.length) {
		enableLight(lightArray[data]);
		updateClients(socket);
		lastCommandTime = new Date();
	    }
	});

	socket.on('light disable', function(data) {
	    if (data >= 0 && data < lightArray.length) {
		disableLight(lightArray[data]);
		updateClients(socket);
		lastCommandTime = new Date();
	    }
	});

	socket.on('disable all', function(data) {
	    disableAll();
	    updateClients(socket);
	    lastCommandTime = new Date();
	});

	/* If we go too long without activity, begin a default
	 * sequence. */
	var idleCheck = function() {
	    var timeNow = new Date();
	    if (!inIdle && lastCommandTime.getTime() + IDLE_TIMEOUT < timeNow.getTime())
		doSequence(sequence.events, socket);
	}
	setInterval(idleCheck, 1000);
    }
    else {
	/* The socket is disabled.  Tell the client to go take a long walk. */
	socket.disconnect();
    }
});

function doSequence(events, socket) {
    var timeBegan = new Date();
    var timeIdleBegan = lastCommandTime;  // The time that the idle period began.

    inIdle = true;
    disableAll();
    updateClients(socket);

    var executeEvents = function(nextEvent, nextEventTime) {
	// If there has been a command since we last went idle, then we're done here.
	if (lastCommandTime.getTime() > timeIdleBegan.getTime()) {
	    inIdle = false;
	    return;
	}

	var timeNow = new Date();
	var elapsed = timeNow.getTime() - timeBegan.getTime();

	while (elapsed >= nextEventTime) {
	    var index = events[nextEvent].index;
	    if (index >= 0 && index < lightArray.length)
		lightArray[index].enabled = events[nextEvent].enabled;

	    nextEvent++;
	    if (nextEvent >= events.length)
		nextEvent = 0;

	    nextEventTime += events[nextEvent].afterDelay;
	}
	updateClients(socket);

	var delay = nextEventTime - elapsed;
	setTimeout(executeEvents, delay, nextEvent, nextEventTime);
    };

    if (events.length > 0)
	executeEvents(0, events[0].afterDelay);
}

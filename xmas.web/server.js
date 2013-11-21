"use strict";

var express = require('express');
var http = require('http');
var socketio = require('socket.io');

var sequence = require('./sequence.json');

/* After a light turns on, it cannot turn on again until after this
 * delay passes. The delay servers as a rate limit, preventing the
 * light from turning on and off many times a second. */
var LIGHT_ON_DELAY = 500;

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
    if (now.getTime() >= light.lastLit + 2000) {
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
server.listen(8080);

app.use(express.static(__dirname + '/public'));

function updateClients(socket) {
    var bitfield = lightStateBitField();
    socket.emit('server update', bitfield);
    socket.broadcast.emit('server update', bitfield);
}

io.sockets.on('connection', function(socket) {
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

    /* If we go too long without activity, begin a default
     * sequence. */
    function idleCheck() {
	var timeNow = new Date();
	if (!inIdle && lastCommandTime.getTime() + 5000 < timeNow.getTime())
	    doSequence(sequence.events, socket);
    }
    setInterval(idleCheck, 1000);

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

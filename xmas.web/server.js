"use strict";

var express = require('express');
var http = require('http');
var socketio = require('socket.io');

/* After a light turns on, it cannot turn on again until after this
 * delay passes. The delay servers as a rate limit, preventing the
 * light from turning on and off many times a second. */
var LIGHT_ON_DELAY = 500;

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

function toggleLight(light) {
    console.log(light);
    if (light.enabled)
	disableLight(light);
    else
	enableLight(light);
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

io.sockets.on('connection', function(socket) {
    socket.emit('server update', lightStateBitField());

    socket.on('light toggle', function(data) {
	if (data >= 0 && data < lightArray.length) {
	    toggleLight(lightArray[data]);

            var bitfield = lightStateBitField();
            socket.emit('server update', bitfield);
	    socket.broadcast.emit('server update', bitfield);
	}
    });
});

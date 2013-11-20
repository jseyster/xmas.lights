"use strict";

var express = require('express');
var http = require('http');
var socketio = require('socket.io');

var lightArray = [ false, false, false, false, false, false, false, false ];

function lightStateBitField() {
    var bitfield = 0;
    for (var i = lightArray.length - 1; i >= 0; i--) {
        bitfield <<= 1;
        bitfield |= lightArray[i] ? 1 : 0;
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
	    lightArray[data] = !lightArray[data];

            var bitfield = lightStateBitField();
            socket.emit('server update', bitfield);
	    socket.broadcast.emit('server update', bitfield);
	}
    });
});

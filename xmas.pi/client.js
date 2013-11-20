"use strict";

var PIPE_NAME = '/tmp/xmas';

/* This client forwards the latest state to the Xmas Daemon whenever
 * it sees an update from the node.js Christmas Lights server. */

var fs = require('fs');
var io = require('socket.io-client');

var pipe = fs.openSync(PIPE_NAME, 'w');

var socket = io.connect('http://localhost:8080');
socket.on('server update', function(data) {
    var buffer = new Buffer([data]);
    fs.writeSync(pipe, buffer, 0, 1);
});

"use strict";

var PIPE_NAME = '/tmp/xmas';

/* This client forwards the latest state to the Xmas Daemon whenever
 * it sees an update from the node.js Christmas Lights server. */

var fs = require('fs');
var io = require('socket.io-client');

var serverName;
if (process.argv.length === 3) {
    serverName = process.argv[2];
}
else {
    console.log("client.js takes the server to connect to as its only argument");
    process.exit(1);
}

var pipe = fs.openSync(PIPE_NAME, 'w');

var socket = io.connect(serverName);
socket.on('server update', function(data) {
    var buffer = new Buffer([data]);
    fs.writeSync(pipe, buffer, 0, 1);
});

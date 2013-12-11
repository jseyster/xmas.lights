Xmas.lights
===========

This is all the code behind my 2013 holiday project to set up
Christmas lights that anyone can control over the Internet.  I'm not
sure that this code will be of much use to anybody else, but I thought
perhaps some people might be curious about the details of how
everything is implemented.

The hardware itself is a circuit board with eight mounted relays that
I connected to the eight GPIO pins of a Raspberry Pi.  A simple
daemon, available in the xmas.pi subdirectory of this repository,
allows applications to set the state of the GPIO pins by communicating
over a named pipe.

The xmas.web subdirectory has the Node.js server that provides a Web
interface for the lights.  The Raspberry Pi runs a simple Node.js
client that observes the state of the lights according to the server
and pipes it to the xmas.pi daemon.

The Raspberry Pi client is in no way privileged.  If you have some
kind of lights set up, you could use the client to control them with
my server, so that your lights and my lights would be in sync!  (You
could also run your own server.  I host mine on Heroku.)

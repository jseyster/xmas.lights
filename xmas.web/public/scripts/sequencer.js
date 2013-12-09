// Copyright (c) 2013, Rick Spillane and Justin Seyster
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//
// 1. Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following
// disclaimer in the documentation and/or other materials provided
// with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.

// sequencer.js:
// Given a canvas element, the Sequencer renders an interactive
// sequencer which can be manipulated by the mouse. There is an
// 'Upload' button for loading the sequence program up to a server.
// The sequence plays in a loop on the client-side preview widget.

// Create a new Sequencer.
// interval: The length of time in ms between each switch event
// seqlen: The number of switch events in a single loop
// lights: An array of Light objects

"use strict";

var numLights = 8;
var numSteps = 32;

var currentDotColor = 'Orange';
var disabledColor = 'Gray';
var whiteColor = 'rgb(238, 238, 255)';

var sequencer;

var Sequencer = function(interval, seqlen, lights) {
    this.interval = interval;
    this.seqlen = seqlen;
    this.lights = lights;
    this.cycle = 0;
    this.seqFill = '#999';
    this.sequence = [];
    for (var i = 0; i < lights.length; ++i) {
	var switchSeq = [];
	for (var j = 0; j < this.seqlen; ++j) {
	    switchSeq[j] = false;
	}
	this.sequence[i] = switchSeq;
    }
    this.handle = null;
};

Sequencer.prototype.updateControls = function(switch_i, seq_i) {
    if (switch_i >= 0 && switch_i < this.lights.length &&
	seq_i >= 0 && seq_i < this.seqlen) {
	var enabled = !this.sequence[switch_i][seq_i];
	this.sequence[switch_i][seq_i] = enabled;

	var id = 'seq-element-' + switch_i + '-' + seq_i;
	var seqElement = document.getElementById(id);
	var color;
	if (enabled) {
	    color = this.lights[switch_i].color;
	    if (color === 'White')  // Replace white with off-white to avoid white-on-white display
		color = whiteColor;
	}
	else {
	    color = disabledColor;
	}
	seqElement.style.background = color;
    }
};

// Set the lights to match a step.  We make no assumptions about how
// the lights were previous set, so we have to send an explicit on/off
// signal to each light.
Sequencer.prototype.execFirst = function(step) {
    for (var i = 0; i < this.lights.length; i++) {
	setLight(i, this.sequence[i][step]);
    }
}

// Set the lights to match a step, assuming that they already match
// the pattern from the previous step.  This assumption reduces
// network traffic.
Sequencer.prototype.execStep = function(step) {
    var prevStep = (step > 0) ? step - 1 : this.seqlen - 1;
    for (var i = 0; i < this.lights.length; i++) {
	if (this.sequence[i][prevStep] != this.sequence[i][step])
	    setLight(i, this.sequence[i][step]);
    }
}

Sequencer.prototype.loop = function() {
    this.cycle = 0;
    if (this.handle) {
	clearInterval(this.handle);
	this.handle = null;
    }

    this.execFirst(this.cycle);
    var seqDot = document.getElementById('seq-dot' + this.cycle);
    seqDot.style.background = 'Orange';

    var self = this;
    var play = function() {
	var oldCycle = self.cycle;
	self.cycle++;
	if (self.cycle >= self.seqlen) {
	    self.cycle = 0;
	}

	var oldDot = document.getElementById('seq-dot' + oldCycle);
	var newDot = document.getElementById('seq-dot' + self.cycle);
	oldDot.style.background = disabledColor;
	newDot.style.background = currentDotColor;

	self.execStep(self.cycle);
    }
    this.handle = setInterval(play, this.interval)

    var playButton = document.getElementById('play-button');
    playButton.innerHTML = '&#x25A0;';
};

Sequencer.prototype.stop = function() {
    if (this.handle) {
	clearInterval(this.handle);
	this.handle = null;
    }

    var seqDot = document.getElementById('seq-dot' + this.cycle);
    seqDot.style.background = disabledColor;

    var playButton = document.getElementById('play-button');
    playButton.innerHTML = '&#x25b6;';
}

Sequencer.prototype.isLooping = function() {
    return (this.handle);
}

Sequencer.prototype.clearPattern = function() {
    for (var i = 0; i < this.lights.length; i++) {
	for (var j = 0; j < this.seqlen; j++) {
	    this.sequence[i][j] = false;

	    var id = 'seq-element-' + i + '-' + j;
	    var element = document.getElementById(id);
	    element.style.background = disabledColor;
	}
    }
}

function elementClicked(row, col) {
    sequencer.updateControls(row, col);
}

function playButton() {
    if (sequencer.isLooping()) {
	sequencer.stop();
    }
    else {
	sequencer.loop();
    }
}

function clearPatternButton() {
    sequencer.stop();
    sequencer.clearPattern();
}

function element(row, col, extraStyle) {
    var clickMethod = 'elementClicked(' + row + ', ' + col + '); return false;';
    var elementId = 'seq-element-' + row + '-' + col;
    return '<a href="#" onclick="' + clickMethod + '" id="' + elementId + '" class="sequencer-element ' + extraStyle + '"></a>'
}

function oneRow(rowIndex, leftStyle, rightStyle) {
    var html = '<div class="seq-color-dot-container"><div id="seq-color' + rowIndex + '" class="light-color-dot"></div></div>';
    html += '<div class="seq-row-container">';

    html += element(rowIndex, 0, leftStyle);

    for (var i = 1; i < numSteps - 1; i++) {
	html += element(rowIndex, i, '');
    }

    html += element(rowIndex, numSteps - 1, rightStyle);

    html += '</div>';
    return html;
}

function seqDotRow() {
    var html = '<div class="seq-color-dot-container"></div>';
    html += '<div class="seq-row-container">';

    for (var i = 0; i < numSteps; i++) {
	html += '<div class="seq-dot-container"><div id="seq-dot' + i + '" class="seq-timing-dot"></div></div>';
    }

    html += '</div>';

    return html;
}

function writeSequencer(container, lightArray) {
    var seqHtml = '<h4 class="content-subhead">Sequencer</h4><br /><br />';

    seqHtml += oneRow(0, 'left-element', 'right-element');
    seqHtml += '<br />'
    seqHtml += oneRow(1, 'top-left-element', 'top-right-element');

    for (var i = 2; i < numLights - 2; i++) {
	seqHtml += oneRow(i, '', '');
    }

    seqHtml += oneRow(numLights - 2, 'bottom-left-element', 'bottom-right-element');
    seqHtml += '<br />'
    seqHtml += oneRow(numLights - 1, 'left-element', 'right-element');

    seqHtml += seqDotRow();

    container.innerHTML = seqHtml;

    sequencer = new Sequencer(300, numSteps, lightArray);
}

var util = require('util');
var log = require('./log');
var ircbot = require('./ircbot');
var ircconfig = require('config').irc;
var webconfig = require('config').web;
var bots = [ ];

var logger = new Log();
console.log("Splunkbot started");

logger.send("Splunkbot launching");

for (var i=0; i < ircconfig.length; i++) {
    bots[i] = new ircbot.IrcBot(ircconfig[i], webconfig);
    bots[i].open();
}


//splunklog.close();
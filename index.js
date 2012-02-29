var util = require('util');
var splunklog = require('./splunklog');
var ircbot = require('./ircbot');
var ircconfig = require('config').irc;
var webconfig = require('config').web;
var bots = [ ];

console.log("Splunkbot started");

splunklog.open();
splunklog.log("Splunkbot launching");

for (var i=0; i < ircconfig.length; i++) {
    bots[i] = new ircbot.IrcBot(ircconfig[i], webconfig);
    bots[i].open();
}


//splunklog.close();
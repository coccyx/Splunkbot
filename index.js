var util = require('util');
var splunklog = require('./splunklog');
var ircbot = require('./ircbot');
var ircconfig = require('config').irc;
var bots = [ ];

console.log("Splunkbot started");

splunklog.open();
splunklog.log("Splunkbot launching");

for (var i=0; i < ircconfig.length; i++) {
    bots[i] = new ircbot.IrcBot(ircconfig[i]);
    bots[i].open();
}


//splunklog.close();
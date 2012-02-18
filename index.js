var util = require('util');
var splunklog = require('./splunklog');
var ircbot = require('./ircbot');

console.log("Splunkbot started");

splunklog.open();
splunklog.log("Splunkbot launching");

var irc = new ircbot.IrcBot();
irc.open();

//splunklog.close();
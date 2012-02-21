var irc = require('irc');
var util = require('util');
var search = require('./search');
var splunklog = require('./splunklog');
//var web = require('./web/app');

/*
** Constructor.  Create state in the object
*/
IrcBot = function(config) {
    this.config = config;
    this.client = new irc.Client(this.config.server, this.config.nick, this.config);
    this.names = { };
}

/*
** Opens a connection to the IRC server
*/
IrcBot.prototype.open = function() {
    splunklog.log(util.format("Connecting to IRC.  ircserver=%s, ircnick=%s, ircconfig=%j", 
                    this.config.server, this.config.nick, this.config));
    var ircBot = this;
    this.client.connect(ircBot.config.retryCount, function() {
        splunklog.log(util.format("Connected.  ircserver=%s, ircnick=%s", ircBot.config.server, ircBot.config.nick));
        
        ircBot.addListeners();
    });
}

/*
** Add listeners to parse IRC messages
*/
IrcBot.prototype.addListeners = function() {
    var ircBot = this;
    this.client.addListener("registered", function(message) {
        var strout = 'server='+this.opt.server+' action=registered nick='+this.opt.nick;
        splunklog.log(strout);
    });

    this.client.addListener("names", function(channel, nicks) {
        // Update names cache which we'll look up against when we get messages and notices
        ircBot.names[channel] = nicks;
        
        var strout = 'server='+this.opt.server+' action=names names="';
        for (nick in nicks) {
            strout += nicks[nick]+nick+' ';
        }
        strout = strout+'"';
        splunklog.log(strout);
    });

    this.client.addListener("topic", function(channel, topic, nick, message) {
        var objout = { server: this.opt.server, action: 'topic', nick: nick, prettynick: ircBot.prettynick(channel, nick), topic: topic };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=topic nick='+nick+ircBot.prettynick(channel, nick)+' topic="'+topic+'"';
        //splunklog.log(strout);
    });

    this.client.addListener("join", function(channel, nick, message) {
        var objout = { server: this.opt.server, action: 'join', nick: nick, channel: channel };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=join nick='+nick+' channel='+channel;
        //splunklog.log(strout);
    });

    this.client.addListener("part", function(channel, nick, reason, message) {
        var objout = { server: this.opt.server, action: 'part', nick: nick, channel: channel, reason: reason };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=part nick='+nick+' channel='+channel+reason?' reason="'+reason+'"':"";
        //splunklog.log(strout);
    });

    this.client.addListener("quit", function(nick, reason, channels, message) {
        var objout = { server: this.opt.server, action: 'quit', nick: nick, channels: channels, reason: reason };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=quit nick='+nick+' reason="'+reason+'"';
        //splunklog.log(strout);
    });

    this.client.addListener("kick", function(channel, nick, by, reason, message) {
        var objout = { server: this.opt.server, action: 'kick', nick: nick, channel: channel, kicked_by: by,
                        reason: reason };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=kick nick='+nick+ircBot.prettynick(channel, nick)+' kicked_by='+by+' reason="'+reason+'"';
        //splunklog.log(strout);
    });

    this.client.addListener("kill", function(nick, reason, channels, message) {
        var objout = { server: this.opt.server, action: 'kill', nick: nick, channels: channels, message: message };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=kill nick='+nick+' reason="'+reason+'"';
        //splunklog.log(strout);
    });

    this.client.addListener("message", function(nick, to, text, message) {
        var action = 'message';
        
        // Check if we're CTCP
        if (text.charAt(0) == "\u0001") {
            var seppos = text.search(" ") > 0 ? text.search(" ") : text.length-1;
            var command = text.substr(1, seppos-1);
            var argstr = text.substr(seppos+1);
            
            switch (command) {
                case 'VERSION':
                    action = 'ctcp_version';
                    ircBot.client.notice(nick, "\u0001VERSION "+ircBot.config.version+"\u0001");
                    
                case 'PING':
                    action = 'ctcp_ping';
                    ircBot.client.notice(nick, "\u0001PING "+Math.round(new Date().getTime()/1000,0)+"\u0001");
            }
        }
        
        if (text.charAt(0) == "!") {
            var seppos = text.search(" ") > 0 ? text.search(" ") : text.length;
            var command = text.substr(1, seppos-1);
            var argstr = text.substr(seppos+1);
            
            // Validate input
            if (!argstr.search("|")) {
                ircBot.dispatchCommand(nick, command, argstr, to);
            }
        }
        var objout = { server: this.opt.server, action: action, nick: nick, prettynick: ircBot.prettynick(to, nick),
                        to: to, text: text };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action='+action+' nick='+nick+ircBot.prettynick(to, nick)+' to='+to+' text="'+text.replace(/"/g, '\\"')+'"';
        //splunklog.log(strout);
    });

    this.client.addListener("notice", function(nick, to, text, message) {
        var objout = { server: this.opt.server, action: 'notice', nick: nick, prettynick: ircBot.prettynick(to, nick),
                        to: to, text: text };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=notice nick='+nick+ircBot.prettynick(to, nick)+' to='+to+' text="'+text.replace(/"/g, '\\"')+'"';
        //splunklog.log(strout);
    });

    this.client.addListener("nick", function(oldnick, newnick, channels, message) {
        var objout = { server: this.opt.server, action: 'nick', oldnick: oldnick, newnick: newnick, channels: channels };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=nick oldnick='+oldnick+' newnick='+newnick;
        //splunklog.log(strout);
    });

    this.client.addListener("invite", function(channel, nick, message) {
        var objout = { server: this.opt.server, action: 'invite', nick: nick, channel: channel };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=invite channel='+channel+' nick='+nick;
        //splunklog.log(strout);
    });

    this.client.addListener("+mode", function(channel, by, mode, argument, message) {
        var objout = { server: this.opt.server, action: '+mode', channel: channel, by: by,
                        mode: mode, argument: argument };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=addmode channel='+channel+' by='+by+' mode='+mode+' argument="'+argument.replace(/"/g, '\\"')+'"';
        //splunklog.log(strout);
        
        // Update state of the names cache when modes change
        this.client.send("NAMES", channel);
    });

    this.client.addListener("-mode", function(channel, by, mode, argument, message) {
        var objout = { server: this.opt.server, action: '-mode', channel: channel, by: by,
                        mode: mode, argument: argument };
        splunklog.log(objout);
        //var strout = 'server='+this.opt.server+' action=delmode channel='+channel+' by='+by+' mode='+mode+' argument="'+argument.replace(/"/g, '\\"')+'"';
        //splunklog.log(strout);
        
        // Update state of the names cache when modes change
        ircBot.client.send("NAMES", channel);
    });
    
    // Every minute, send ourselves a PING
    setInterval(function() {
            ircBot.client.say(ircBot.config.nick, "\u0001PING "+Math.round(new Date().getTime()/1000,0)+"\u0001");
        }, 60000);
}

/*
** When we receive a message, if it contains a preceding !, we send the parsed
** output to this function to determine which actions to take
*/
IrcBot.prototype.dispatchCommand = function(nick, command, argstr, to) {
    var ircBot = this;
    var dispatch = { }
    dispatch.seen = function() {

    }
    dispatch.search = function() {
        search.logsearch(argstr, function(err, log) {
                if (typeof log === 'string') {
                    var logarr = log.split("\n");
                    for (var i=0; i<logarr.length; i++) {
                        ircBot.client.say(nick, logarr[i]);
                    }
                }
            });
    }
    dispatch.lasturls = function() {
        search.lasturls(to, function(err, log) {
                if (typeof log === 'string') {
                    var logarr = log.split("\n");
                    for (var i=0; i<logarr.length; i++) {
                        ircBot.client.say(nick, logarr[i]);
                    }
                }
            }, argstr);
    }
    if (typeof dispatch[command] === 'function') {
        dispatch[command]();
    }
}

/*
** Disconnects the IRC Client
*/
IrcBot.prototype.close = function(message) {
    this.client.disconnect(message);
}

/*
** Return status of the nick from the names cache along with the nick
** Will return nick, +nick, @nick, etc.
*/
IrcBot.prototype.prettynick = function (channel, nick) {
    //console.log("channel: %s nick: %s", channel, nick);
    var prefix = "";
    if (typeof this.names[channel] !== 'undefined') {
        //console.log("prettynick: %s", names[channel][nick]);
        prefix = this.names[channel][nick];
    }
    return prefix+nick;
}


exports.IrcBot = IrcBot;

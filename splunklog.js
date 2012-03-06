SYSLOGCONFIG = require('config').syslog;
TIMEOUTCONFIG = require('config').reconnect_timeout;
TIMEOUTCONFIG = typeof TIMEOUTCONFIG === 'number' ? TIMEOUTCONFIG : 2000;
var util = require('util');
var net = require('net');
var connectedlist = [ ];
var connectinglist = [ ];
var events = require('events');
var emitter = new events.EventEmitter();
var clients = [ ];
var queue = [ ];

function connecting() {
    var ret = false;
    for (var i=0; i < SYSLOGCONFIG.length; i++) {
        if (connectinglist[i]) {
            ret = true;
        }
    }
    return ret;
}

function connected() {
    var ret = false;
    for (var i=0; i < SYSLOGCONFIG.length; i++) {
        if (connectedlist[i]) {
            ret = true;
        }
    }
    return ret;
}

function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

function getTS() {
    var dt = new Date();
    var hours = pad(dt.getHours(),2);
    var minutes = pad(dt.getMinutes(),2);
    var seconds = pad(dt.getSeconds(),2);
    var month = dt.getMonth();
    var day = pad(dt.getDate(),2);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var eventstamp = months[month] + " " + day + " " + hours + ":" + minutes + ":" + seconds;
    return eventstamp;
}

function open(logout) {
    console.log("splunklog.open() called.  Queue size: ", queue.length);
    if (!connecting()) {
        console.log("Iterating through connections. Queue size: ", queue.length);
        for (var i=0; i < SYSLOGCONFIG.length; i++) {
            if (!connectedlist[i]) {
                function fixLoop(idx) {
                    connectinglist[idx] = true;
                    console.log("Connecting to %s:%s", SYSLOGCONFIG[i].syslog_host, SYSLOGCONFIG[i].syslog_port);
                    function connectedCallback(idx) {
                        console.log("Connected to %s:%s", SYSLOGCONFIG[idx].syslog_host, SYSLOGCONFIG[idx].syslog_port);
                        connectedlist[idx] = true;
                        connectinglist[idx] = false;
                        flushqueue();
                    }
                    function disconnectedCallback(idx) {
                        console.log("Remote side disconnected.  Reconnecting to %s:%s", SYSLOGCONFIG[idx].syslog_host, SYSLOGCONFIG[idx].syslog_port);
                        connectedlist[idx] = false;
                        
                        setTimeout(TIMEOUTCONFIG, function () { open(); });
                    }
                    clients[idx] = net.createConnection(SYSLOGCONFIG[idx].syslog_port, SYSLOGCONFIG[idx].syslog_host, 
                                                        function() { connectedCallback(idx) });
                    clients[idx].on('end', function() { disconnectedCallback(idx) });
                    clients[idx].on('error', function() { disconnectedCallback(idx) });
                }
                fixLoop(i);
            }
        }
    }
}

function close() {
    for (var i=0; i < SYSLOGCONFIG.length; i++) {
        clients[i].end();
    }
}

function log(logout) {
    // If we're not connected, open the connection and write the log
    if (!connected()) {
        open();
    }
    
    var strout = '';
    if (typeof logout === 'object') {
        //strout = util.format("%j", logout);
        logout.timestamp = getTS();
        strout = util.format("%s %j", getTS(), logout);
    } else {
        strout = util.format("%s %s", getTS(), logout);
    }
    
    queue.push(strout);
    flushqueue();
}

function flushqueue() {
    var s = '';
    if (connected()) {
        while (s = queue.shift()) {
            console.log("splunklog: %s", s);
            for (var i=0; i < SYSLOGCONFIG.length; i++) {
                clients[i].write(s+'\n');
            }
        }
    }
}

exports.log = log;
exports.open = open;
exports.close = close;

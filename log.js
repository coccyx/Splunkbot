var storm = require('splunkstorm');
var loggly = require('loggly');
var net = require('net');
var util = require('util');
CONFIG = require('config').log;

/*
** Constructor.  Create state in the object
*/
Log = function() {
    this.config = [ ];
    for (var i=0; i < CONFIG.length; i++) {
        this.config[i] = { };
        if (CONFIG[i].type == 'storm') {
            this.config[i].type = 'storm';
            this.config[i].access_token = CONFIG[i].access_token;
            this.config[i].project_id = CONFIG[i].project_id;
            this.config[i].sourcetype = CONFIG[i].sourcetype;
            this.config[i].source = CONFIG[i].source;
            this.config[i].host = CONFIG[i].host;
            this.config[i].obj = new storm.Log(this.config[i].access_token, this.config[i].project_id);
        } else if (CONFIG[i].type == 'loggly') {
            this.config[i].type = 'loggly';
            this.config[i].input_key = CONFIG[i].input_key;
            this.config[i].subdomain = CONFIG[i].subdomain;
            this.config[i].username = CONFIG[i].username;
            this.config[i].password = CONFIG[i].password;
            var config = {
                subdomain: this.config[i].subdomain,
                auth: {
                  username: this.config[i].username,
                  password: this.config[i].password
                },
                json: true
            };
            this.config[i].obj = loggly.createClient(config);
        } else if (CONFIG[i].type == 'syslog') {
            this.config[i].type = 'syslog';
            this.config[i].host = CONFIG[i].host;
            this.config[i].port = CONFIG[i].port;
            this.config[i].obj = new Syslog(this.config[i].host, this.config[i].port);
        }
    }
}

/*
** Sends message to all the logging servers
*/
Log.prototype.send = function(message, callback) {
    for (var i=0; i < this.config.length; i++) {
        if (this.config[i].type == 'storm') {
            this.config[i].obj.send(message, this.config[i].sourcetype, this.config[i].host,
                                    this.config[i].source, callback);
        } else if (this.config[i].type == 'loggly') {
            // if (typeof message === 'object') {
            //     message = JSON.stringify(message);
            // }
            this.config[i].obj.log(this.config[i].input_key, message, callback);
        } else if (this.config[i].type == 'syslog') {
            this.config[i].obj.send(message);
        }
    }
    if (typeof message === 'object') {
        console.log(util.format("logged: %j", message));
    } else {
        console.log(util.format("logged: %s", message));
    }
}

/*
** Constructor.  Create state in the object
*/
Syslog = function(host, port) {
    this.host = host;
    this.port = port;
}

Syslog.prototype.pad = function(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

Syslog.prototype.getTS = function() {
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

Syslog.prototype.send = function(logout) {
    var conn = net.createConnection(this.port, this.host, function() {
        // var strout = '';
        // if (typeof logout === 'object') {
        //     //strout = util.format("%j", logout);
        //     logout.timestamp = getTS();
        //     strout = util.format("%s %j", getTS(), logout);
        // } else {
        //     strout = util.format("%s %s", getTS(), logout);
        // }
        
        if (typeof logout === 'object') {
            logout = JSON.stringify(logout);
        }
        
        conn.write(logout);
        conn.end();
    })
    // Ignore closing and errors
    conn.on('end', function() { });
    conn.on('error', function() { });
}

if (module === require.main) {
    var logger = new Log();
    logger.send("Test message");
}

exports.Log = Log;

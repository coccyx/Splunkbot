var util = require('util');
var splunk = require('./splunk');
var irclog = require('./irclog');

/*
** Takes a search string, searches splunk and outputs in IRC Log format
*/

function logsearch(searchstr, callback, limit, earliest_time, latest_time) {
    var limit = limit || 25;
    var splunksearch = "search `irclogs` | search "+searchstr+" | head "+limit+" | "
                    +"fields _raw, _time, host, index, source, sourcetype, action, reason, "
                    +"channel, prettynick, names, oldnick, newnick, nick, server, text, to, topic";
    splunk.search(splunksearch, function(err, results) {
        if (err) {
            callback(err);
        } else {
            callback(null, irclog.makeirclog(results));
        }
    }, earliest_time, latest_time);
}

/*
** Takes a search string, searches splunk and outputs in JSON format which looks like:
** { fields [ 'list', 'of, 'fields' ]
**   rows [ [ 'list', 'of', 'fields' ], ['list', 'of', 'fields'] ] }
*/

function search(searchstr, callback, limit, earliest_time, latest_time) {
    var limit = limit || 25;
    var splunksearch = "search `irclogs` | search "+searchstr+" | head "+limit+" | "
                    +"fields _raw, _time, host, index, source, sourcetype, action, reason, "
                    +"channel, prettynick, names, oldnick, newnick, nick, server, text, to, topic";
    splunk.search(splunksearch, function(err, results) {
        if (err) {
            callback(err);
        } else {
            callback(null, results);
        }
    }, earliest_time, latest_time);
}

function lasturls(to, callback, limit, formatcallback, earliest_time, latest_time) {
    var formatcallback = formatcallback || function(rows, fields) {
                                                var retstr = '';
                                                for (var i=0; i < rows.length; i++) {
                                                    retstr += rows[i][fields.indexOf('url')]+' at '+irclog.maketime(rows[i][fields.indexOf('_time')])
                                                            +' by '+rows[i][fields.indexOf('nick')]+'\n';
                                                }
                                                return retstr;
                                            }
    var limit = limit || 3;
    var splunksearch = "search `irclogs` | search action=message to="+to+" http:// | rex \"(?P<url>http://[^\\\" ]+)\" | "
                    +"head "+limit+" | fields _time, nick, url";
    splunk.search(splunksearch, function(err, results) {
        if (err) {
            callback(err);
        } else {
            callback(null, formatcallback(results.rows, results.fields));
        }
    }, earliest_time, latest_time, limit);
}

/* For testing only, if we're called as a standalone script, do a search and output it as an irc log */
if (module === require.main) {
    /*var searchstr = "search sourcetype=splunkbot_logs Coccyx | reverse | "
                    +"fields _raw, _time, host, index, source, sourcetype, action, reason, "
                    +"channel, prettynick, names, oldnick, newnick, nick, server, text, to, topic";*/
    /*search(searchstr, function(err, results) {
            if (err) {
                // Error
                console.log("Error: ", err)
            } else {
                console.log(results);
            }
        }, '-24h');*/
    /*splunk.search(searchstr, function(err, results) {
            if (err) {
                // Error
                console.log("Error: ", err)
            } else {
                console.log(makeirclog(results));
            }
        });*/
    search("Coccyx", function(err, log) { 
        if (err) {
            console.log("Error: "+err);
        } else {
            console.log(log);
        }
    });
    logsearch("Coccyx", function(err, log) { 
        if (err) {
            console.log("Error: "+err);
        } else {
            console.log(log);
        }
    });
    lasturls("#splunk", function(err, log) { 
        if (err) {
            console.log("Error: "+err);
        } else {
            console.log(log);
        }
    });
}

exports.search = search;
exports.logsearch = logsearch;
exports.lasturls = lasturls;
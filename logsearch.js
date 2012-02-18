var util = require('util');
var splunk = require('./splunk');

/*
** Takes any integer and returns a string of at least length digits
** If the integer is less than length, it pads the left side with zeros
*/
function pad(number, length) {
    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

/*
** Takes any string and returns a string of at least length characters
** If the string is less than length, it pads the left side with spaces
*/
function strpad(str, length) {
    var strout = '' + str;
    while (strout.length < length) {
        strout = ' ' + strout;
    }
    return strout;
}

/*
** Takes any date Javascript can parse and outputs Mon DD YYYY
*/
function makedate(datestr) {
    var monthtext = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
    var dtm = new Date(datestr);
    return monthtext[dtm.getMonth()]+" "+pad(dtm.getDate(), 2)+" "+dtm.getFullYear();
}

/*
** Takes any date Javascript can parse and outputs HH:MM:SS
*/
function maketime(datestr) {
    var dtm = new Date(datestr);
    return pad(dtm.getHours(), 2)+':'+pad(dtm.getMinutes(), 2)+':'+pad(dtm.getSeconds(), 2);
}

/*
** Utility function for makeirclog that takes a row of splunksearch results and outputs an IRC Log format
*/

function makeircline(row, fields) {
    var dispatch = { };
    dispatch['join'] = function(result, fields) { 
                            return util.format("%s -!- %s has joined %s\n", maketime(row[fields.indexOf('_time')]),
                                                row[fields.indexOf('nick')], row[fields.indexOf('channel')]);
                        };
    dispatch['part'] = function(result, fields) {
                            if (row[fields.indexOf('reason')] == 'undefined' ||
                                row[fields.indexOf('reason')] == 'null') {
                                return util.format("%s -!- %s has left %s\n", maketime(row[fields.indexOf('_time')]),
                                                    row[fields.indexOf('nick')], row[fields.indexOf('channel')]);
                            } else {
                                return util.format("%s -!- %s has left %s (%s)\n", maketime(row[fields.indexOf('_time')]),
                                                    row[fields.indexOf('nick')], row[fields.indexOf('channel')],
                                                    row[fields.indexOf('reason')]);
                            }
                        };
    dispatch['quit'] = function(result, fields) {
                            return util.format("%s -!- %s has quit IRC (%s)\n", maketime(row[fields.indexOf('_time')]),
                                                row[fields.indexOf('nick')], row[fields.indexOf('reason')]);
                        };
    dispatch['topic'] = function(result, fields) {
                            return util.format("%s -!- %s changed the topic of %s to: %s\n", maketime(row[fields.indexOf('_time')]),
                                                row[fields.indexOf('nick')], row[fields.indexOf('channel')],
                                                row[fields.indexOf('topic')]);
                        };
    dispatch['nick'] = function(result, fields) {
                            return util.format("%s -!- %s is now known as %s\n", maketime(row[fields.indexOf('_time')]),
                                                strpad(row[fields.indexOf('oldnick')],9), row[fields.indexOf('newnick')]);
                        };
    dispatch['message'] = function(result, fields) {
                            // Make sure we have a string
                            row[fields.indexOf('text')] = row[fields.indexOf('text')] == null ? "" : row[fields.indexOf('text')];
                            
                            if (row[fields.indexOf('text')].substr(0, 10) == '\\x01ACTION') {
                                var metext = row[fields.indexOf('text')].substring(10, row[fields.indexOf('text')].length-4);
                                return util.format("%s * %s %s\n", maketime(row[fields.indexOf('_time')]),
                                                    strpad(row[fields.indexOf('nick')],9), metext);
                            } else if (row[fields.indexOf('text')].substr(0, 4) == '\\x01') {
                                return util.format("%s -%s- CTCP %s\n", maketime(row[fields.indexOf('_time')]),
                                                    strpad(row[fields.indexOf('nick')],9), row[fields.indexOf('text')].substr(4, row[fields.indexOf('text')].length-8));
                            } else {
                                return util.format("%s <%s> %s\n", maketime(row[fields.indexOf('_time')]),
                                                    strpad(row[fields.indexOf('nick')],9), row[fields.indexOf('text')]);
                            }
                        };
    dispatch['notice'] = function(result, fields) {
                            return util.format("%s -%s- %s\n", maketime(row[fields.indexOf('_time')]),
                                                strpad(row[fields.indexOf('nick')],9), row[fields.indexOf('text')]);
                        };
    if (typeof dispatch[row[fields.indexOf('action')]] === 'function') {
        return dispatch[row[fields.indexOf('action')]](row, fields);
    } else {
        return "";
    }
}


/*
** Takes search results object from splunksearch and outputs in an IRC Log format
*/

function makeirclog(results) {
    var retstr = '';
    if (results.rows.length > 0) {
        var lastdate = makedate(results.rows[0][results.fields.indexOf('_time')]);
        for (var i=0; i < results.rows.length; i++) {
            var row = results.rows[i];
            var fields = results.fields;
            var date = makedate(row[fields.indexOf('_time')]);
            if (date != lastdate) {
                retstr += 'Day changed to '+date+'\n';
            }
            retstr += makeircline(results.rows[i], results.fields);
            lastdate = date;
        }
    }
    return retstr;
}

/*
** Takes a search string, searches splunk and outputs in irclog format
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
            callback(null, makeirclog(results));
        }
    }, earliest_time, latest_time);
}

function lasturls(callback, limit, formatcallback, earliest_time, latest_time) {
    var formatcallback = formatcallback || function(rows, fields) {
                                                var retstr = '';
                                                for (var i=0; i < rows.length; i++) {
                                                    retstr += rows[i][fields.indexOf('url')]+' at '+maketime(rows[i][fields.indexOf('_time')])
                                                            +' by '+rows[i][fields.indexOf('nick')]+'\n';
                                                }
                                                return retstr;
                                            }
    var limit = limit || 3;
    var splunksearch = "search `irclogs` | search action=message http:// | rex \"(?P<url>http://[^\\\" ]+)\" | "
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
    lasturls(function(err, log) { 
        if (err) {
            console.log("Error: "+err);
        } else {
            console.log(log);
        }
    });
}

exports.search = search;
exports.lasturls = lasturls;
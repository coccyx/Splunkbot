SPLUNKSEARCHCONFIG = require('config').splunk;
var util = require('util');
var Splunk = require('splunk-sdk');
var Async  = Splunk.Async;

/*
** Takes any date Javascript can parse and outputs YYYY-MM-DDTHH:MM:SS.MS TZ
*/
function makesplunkdate(dtm) {
    return util.format("%s-%s-%sT%s:%s:%s.%s-%s:%s", dtm.getFullYear(), pad(dtm.getMonth()+1, 2),
                        pad(dtm.getDate(), 2), pad(dtm.getHours(), 2),
                        pad(dtm.getMinutes(), 2), pad(dtm.getSeconds(), 2),
                        pad(Math.round(dtm.getMilliseconds(), 3), 3),
                        pad(Math.floor(dtm.getTimezoneOffset() / 60), 2),
                        pad((((dtm.getTimezoneOffset() / 60) % 1.0) * 30), 2));
}

/*
** Takes search string, a call back, and optional earliest_time and latest_time
** and outputs an object which looks like:
{ fields [ 'list', 'of, 'fields' ]
  rows [ [ 'list', 'of', 'fields' ], ['list', 'of', 'fields'] ] }
*/

function search(searchstr, callback, earliest_time, latest_time) {
    // If we don't have a searchstr, error out
    if (searchstr.length == 0 || typeof searchstr=="undefined") {
        callback("Invalid search string");
        return;
    }
    earliest_time = ( isNaN(Date.parse(earliest_time)) ) ? earliest_time : makesplunkdate(new Date(earliest_time));
    latest_time = ( isNaN(Date.parse(latest_time)) ) ? latest_time : makesplunkdate(new Date(latest_time));
    parms = { };
    if (typeof earliest_time !== 'undefined' && earliest_time !== null) {
        parms['earliest_time'] = earliest_time;
    }
    if (typeof latest_time !== 'undefined' && latest_time !== null) {
        parms['latest_time'] = latest_time;
    }
    parms['count'] = 50000;
    
    var service = new Splunk.Service({
        username: SPLUNKSEARCHCONFIG.username,
        password: SPLUNKSEARCHCONFIG.password,
        scheme: SPLUNKSEARCHCONFIG.scheme,
        host: SPLUNKSEARCHCONFIG.host,
        port: SPLUNKSEARCHCONFIG.port
    });

    service.login(function (err, success) {
        if (err || !success) {
            console.log("Error in logging in");
            callback(err || "Login failed");
            return;
        }
        
        service.oneshotSearch(searchstr, parms, callback);
    });
    /*Async.chain([
            // First, we log in
            function(done) {
                service.login(done);
            },
            // Perform the search
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
                
                service.oneshotSearch(searchstr, {}, done);
            },
            // The job is done, and the results are returned inline
            function(results, done) {
                // Find the index of the fields we want
                var rawIndex = results.fields.indexOf("_raw");
                var sourcetypeIndex = results.fields.indexOf("sourcetype");
                var userIndex = results.fields.indexOf("user");
                
                // Print out each result and the key-value pairs we want
                console.log("Results: ");
                for(var i = 0; i < results.rows.length; i++) {
                    console.log("  Result " + i + ": ");
                    console.log("    sourcetype: " + results.rows[i][sourcetypeIndex]);
                    console.log("    user: " + results.rows[i][userIndex]);
                    console.log("    _raw: " + results.rows[i][rawIndex]);
                }
                
                done();
            }
        ],
        function(err) {
            callback(err);        
        }
    );*/
}



exports.search = search;
/*
** Constructor.
*/

Splunkbot = function() {
    var splunkbot = this;
    Async = Splunk.Async;
    utils = Splunk.Utils;
    $.getJSON('/splunkcreds.json', function(data) {
        splunkbot.service = new Splunk.Client.Service(undefined, data);
        $(document).trigger('creds_loaded');
    });
    splunkbot.nicks = { };
    splunkbot.currentcoloridx = 4;
}

/***************************************************
**              UTILITY FUNCTIONS                 **
***************************************************/

/*
** Assigns a nick to a color
*/
Splunkbot.prototype.nickcolor = function(nick) {
    if (typeof this.nicks[nick] === 'undefined') {
        if (this.currentcoloridx >= config_colors.length) {
            this.currentcoloridx = 0;
        }
        this.nicks[nick] = config_colors[this.currentcoloridx];
        this.currentcoloridx++;
    }
    return this.nicks[nick];
}

/*
** Takes any integer and returns a string of at least length digits
** If the integer is less than length, it pads the left side with zeros
*/
Splunkbot.prototype.pad = function(number, length) {
    var str = number.toString();
    while (str.length < length) {
        str = '0' + str;
    }
    return str;
}

/*
** Takes any string and returns a string of at least length characters
** If the string is less than length, it pads the left side with spaces
*/
Splunkbot.prototype.strpad = function(str, length) {
    var strout = str;
    while (strout.length < length) {
        strout = ' ' + strout;
    }
    strout = strout.replace(/ /g, "&nbsp;");
    return strout;
}

/*
** Takes any date Javascript can parse and outputs Mon DD YYYY
*/
Splunkbot.prototype.makedate = function (datestr) {
    var monthtext = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]
      , dtm = new Date(datestr);
    return monthtext[dtm.getMonth()]+" "+this.pad(dtm.getDate(), 2)+" "+dtm.getFullYear();
}

/*
** Takes any date Javascript can parse and outputs HH:MM:SS
*/
Splunkbot.prototype.maketime = function(datestr) {
    var dtm = new Date(datestr);
    return this.pad(dtm.getHours(), 2)+':'+this.pad(dtm.getMinutes(), 2)+':'+this.pad(dtm.getSeconds(), 2);
}

/*
** Takes any date Javascriptcan parse and outputs UNIX timestamp
*/
Splunkbot.prototype.makeunixtime = function(datestr) {
    return new Date(datestr).getTime();
}

/*
** Takes any date Javascript can parse and outputs m/d/yyyy:H:M:S
*/
Splunkbot.prototype.makesplunktime = function(datestr) {
    var dtm = new Date(datestr);
    return (dtm.getMonth()+1)+'/'+dtm.getDate()+'/'+dtm.getFullYear()+':'+splunkbot.pad(dtm.getHours(),2)+':'
            +splunkbot.pad(dtm.getMinutes(),2)+':'+splunkbot.pad(dtm.getSeconds(),2);
}

/*
** Utility function for makeirclog that takes a row of splunksearch results and outputs an IRC Log format
*/

Splunkbot.prototype.makeircline = function(row, fields) {
    var splunkbot = this;
    var dispatch = { };
    dispatch.join = function(result, fields) {
        return sprintf('<td colspan="3">-<span class="%s">!</span>- <span class="%s bold">%s</span> has joined '
                        +'<span class="bold">%s</span></td>', config_colors[1], config_colors[1], 
                        row[fields.indexOf('nick')], row[fields.indexOf('channel')]);
    };
    dispatch.part = function(result, fields) {
        return sprintf('<td colspan="3">-<span class="%s">!</span>- <span class="%s bold">%s</span> has left '
                        +'<span class="bold">%s</span></td>', config_colors[1], config_colors[1], 
                        row[fields.indexOf('nick')], row[fields.indexOf('channel')]);
    };
    dispatch.quit = function(result, fields) {
        return sprintf('<td colspan="3">-<span class="%s">!</span>- <span class="%s bold">%s</span> has quit IRC '
                        +'<span class="%s">[</span><span class="bold">%s</span><span class="%s">]</span></td>',
                        config_colors[1], config_colors[1], config_colors[2], config_colors[2],
                        row[fields.indexOf('nick')], row[fields.indexOf('reason')]);
    };
    dispatch.topic = function(result, fields) {
        return sprintf('<td colspan="3">-<span class="%s">!</span>- <span class="%s bold">%s</span> '
                        +'changed the topic of <span class="bold">%s</span> to: %s</td>',
                        config_colors[1], config_colors[1],
                        row[fields.indexOf('nick')], row[fields.indexOf('channel')],
                        row[fields.indexOf('topic')]);
    };
    dispatch.nick = function(result, fields) {
        return sprintf('<td colspan="3">-<span class="%s">!</span>- <span class="%s bold">%s</span> '
                        +'is now known as <span class="bold">%s</span>',
                        config_colors[1], config_colors[1],
                        row[fields.indexOf('oldnick')], row[fields.indexOf('newnick')]);
    };
    dispatch.message = function(result, fields) {
        // Make sure we have a string
        row[fields.indexOf('text')] = row[fields.indexOf('text')] === null ? "" : row[fields.indexOf('text')];
        
        if (row[fields.indexOf('text')].substr(0, 7) === '\u0001ACTION') {
            var metext = row[fields.indexOf('text')].substring(7, row[fields.indexOf('text')].length-1);
            if (row[fields.indexOf('text')] == urlParams.highlight) {
                metext = '<span class="yellow bold">'+metext+'</span>';
            }
            return sprintf('<td><span class="bold">*</td><td>%s</span> %s</td>', 
                            splunkbot.strpad(row[fields.indexOf('nick')],12), metext);
        } else if (row[fields.indexOf('text')].substr(0, 1) === '\u0001') {
            return sprintf('<td colspan="3">-<span class="bold">%s</span>- CTCP %s</td>',
                            splunkbot.strpad(row[fields.indexOf('nick')],12), 
                            row[fields.indexOf('text')].substr(1, row[fields.indexOf('text')].length-5));
        } else {
            if (row[fields.indexOf('text')] == urlParams.highlight) {
                row[fields.indexOf('text')] = '<span class="yellow bold">'+row[fields.indexOf('text')]+'</span>';
            }
            return sprintf('<td><span class="%s">&lt;</span><span class="%s bold">%s</span>'
                            +'<span class="%s">&gt;</span></td><td>%s</td>',
                            config_colors[2], splunkbot.nickcolor(row[fields.indexOf('nick')]), 
                            splunkbot.strpad(row[fields.indexOf('nick')],12), config_colors[2], row[fields.indexOf('text')]);
        }
    };
    dispatch.notice = function(result, fields) {
        return sprintf('<td><span class="%s">-</span>%s<span class="%s">-</span></td><td>%s</td>',
                            config_colors[2], splunkbot.strpad(row[fields.indexOf('nick')],12), config_colors[2],
                            row[fields.indexOf('text')]);
    };
    
    if (typeof dispatch[row[fields.indexOf('action')]] === 'function') {
        var line = '<tr><td>';
        if (row[fields.indexOf('action')] == 'message' || row[fields.indexOf('action')] == 'notice') {
            line +='<a href="/search?channel='+encodeURIComponent(row[fields.indexOf('to')])
                  +'&time='+splunkbot.makeunixtime(row[fields.indexOf('_time')])
                  +'&highlight='+encodeURIComponent(row[fields.indexOf('text')]);
            if (typeof urlParams.count !== 'undefined') {
                line += '&count='+urlParams.count;
            }
            line += '">';
        }
        line += splunkbot.maketime(row[fields.indexOf('_time')]);
        if (row[fields.indexOf('action')] == 'message' || row[fields.indexOf('action')] == 'notice') {
            line += '</a></td><td><span class="'+config_colors[3]+'">'+row[fields.indexOf('to')]+'</span></td>';
        } else {
            line += '</td>';
        }
        line += dispatch[row[fields.indexOf('action')]](row, fields)+'</tr>';
        return line;
    } else {
        return '<tr><td colspan="4"><b>'+row[fields.indexOf('action')]+' fail</b></td></tr>';
    }
}


/*
** Takes search results object from splunksearch and outputs in an IRC Log format
*/

Splunkbot.prototype.makeirclog = function(results) {
    var retstr = ''
      , lastdate = '';
    if (results.rows.length > 0) {
        lastdate = this.makedate(results.rows[0][results.fields.indexOf('_time')]);
        for (var i=0; i < results.rows.length; i++) {
            var row = results.rows[i]
              , fields = results.fields
              , date = this.makedate(row[fields.indexOf('_time')]);
            if (date != lastdate) {
                retstr += '<tr><td colspan="4">Day changed to '+date+'</td></tr>';
            }
            retstr += this.makeircline(results.rows[i], results.fields);
            lastdate = date;
        }
    }
    return retstr;
}


/***************************************************
**      FORMATTING & SEARCHING FUNCTIONS          **
***************************************************/



/*
** Search Splunk.  Takes full splunk search string and calls a callback with (err, results)
*/
Splunkbot.prototype.search = function(searchstr, callback) {
    var splunkbot = this;
    
    Async.chain([
            // First, we log in
            function(done) {
                splunkbot.service.login(done);
            },
            // Perform the search
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }

                splunkbot.service.search(searchstr, { max_results: 10000 }, done);
            },
            // Wait until the job is done
            function(job, done) {
                Async.whilst(
                    // Loop until it is done
                    function() { return !job.properties().isDone; },
                    // Refresh the job on every iteration, but sleep for 1 second
                    function(iterationDone) {
                        Async.sleep(1000, function() {
                            // Refresh the job and note how many events we've looked at so far
                            job.refresh(function(err) {
                                console.log("-- refreshing, " + (job.properties().eventCount || 0) + " events so far");
                                iterationDone();
                            });
                        });
                    },
                    // When we're done, just pass the job forward
                    function(err) {
                        console.log("-- job done --");
                        done(err, job);
                    }
                );
            },
            // Print out the statistics and get the results
            function(job, done) {
                // Print out the statics
                console.log("Job Statistics: ");
                console.log("  Event Count: " + job.properties().eventCount);
                console.log("  Disk Usage: " + job.properties().diskUsage + " bytes");
                console.log("  Priority: " + job.properties().priority);

                // Ask the server for the results
                job.results({ count: 10000 }, done);
            },
            // Print the raw results out
            function(results, job, done) {
                // Find the index of the fields we want
                var rawIndex        = utils.indexOf(results.fields, "_raw");
                var sourcetypeIndex = utils.indexOf(results.fields, "sourcetype");
                var userIndex       = utils.indexOf(results.fields, "user");

                // Print out each result and the key-value pairs we want
                console.log("Results: ");
                for(var i = 0; i < results.rows.length; i++) {
                    console.log("  Result " + i + ": ");
                    console.log("    sourcetype: " + results.rows[i][sourcetypeIndex]);
                    console.log("    user: " + results.rows[i][userIndex]);
                    console.log("    _raw: " + results.rows[i][rawIndex]);
                }
                
                callback(undefined, results);

                // Once we're done, cancel the job.
                job.cancel(done);
            }
        ],
        function(err) {
            if (err) {
                callback(err); 
            }       
        }
    );
}

/*
** Search Splunk.  Takes full splunk search string and calls a callback with (err, results)
*/
Splunkbot.prototype.rtsearch = function(searchstr, callback) {
    var splunkbot = this;
    Async.chain([
            // First, we log in
            function(done) {
                splunkbot.service.login(done);
            },
            // Perform the search
            function(success, done) {
                if (!success) {
                    done("Error logging in");
                }
            
                splunkbot.service.search(
                    searchstr, 
                    {earliest_time: "rt", latest_time: "rt"}, 
                    done);
            },
            // The search is never going to be done, so we simply poll it every second to get
            // more results
            function(job, done) {
                var MAX_COUNT = 5;
                var count = 0;
            
                Async.whilst(
                    // Loop for N times
                    //function() { return MAX_COUNT > count; },
                    function() { true; },
                    // Every second, ask for preview results
                    function(iterationDone) {
                        Async.sleep(1000, function() {
                            job.preview({}, function(err, results) {
                                if (err) {
                                    iterationDone(err);
                                }
                            
                                // Only do something if we have results
                                if (results.rows) {                                    
                                    // Up the iteration counter
                                    count++;
                                
                                    console.log("========== Iteration " + count + " ==========");
                                    var sourcetypeIndex = utils.indexOf(results.fields, "sourcetype");
                                    var countIndex      = utils.indexOf(results.fields, "count");
                                
                                    for(var i = 0; i < results.rows.length; i++) {
                                        var row = results.rows[i];
                                    
                                        // This is a hacky "padding" solution
                                        var stat = ("  " + row[sourcetypeIndex] + "                         ").slice(0, 30);
                                    
                                        // Print out the sourcetype and the count of the sourcetype so far
                                        console.log(stat + row[countIndex]);   
                                    }
                                
                                    console.log("=================================");
                                    
                                    // Splunkbot inserted to call callback here when we have results
                                    if (results.rows.length > 0) {
                                        callback(undefined, results);
                                    }
                                }
                                
                                // And we're done with this iteration
                                iterationDone();
                            });
                        });
                    },
                    // When we're done looping, just cancel the job
                    function(err) {
                        job.cancel(done);
                    }
                );
            }
        ],
        function(err) {
            callback(err);        
        }
    );
}

/*
** Returns table rows with three columns representing the last URLs from a given channel
*/
Splunkbot.prototype.lasturls = function(count, channel) {
    var splunkbot = this
      , searchstr = "search `irclogs` | search action=message to="+channel+" (http:// OR https://)| "
                    + "rex \"(?P<url>http[s]*://[^\\\" ]+)\" | head "+count+" | fields _time, nick, url";
    
    splunkbot.search(searchstr, function(err, results) {
        if (err) {
            $('#errortext').text(err);
            $('#error').show();
            return;
        } else {
            var html = '';
            for (var i=0; i < results.rows.length; i++) {
                html += '<tr>';
                html += '  <td>'+(i+1)+'</td>';
                html += '  <td><a href="'+results.rows[i][results.fields.indexOf('url')]+'">'
                        +results.rows[i][results.fields.indexOf('url')]+'</a></td>';
                html += '  <td>'+results.rows[i][results.fields.indexOf('nick')]+'</td>';
                html += '  <td>'+splunkbot.makedate(results.rows[i][results.fields.indexOf('_time')])
                            + " " + splunkbot.maketime(results.rows[i][results.fields.indexOf('_time')])+'</td>';
                html += '</tr>';
            }
            $('#urlstablebody').html(html);
        }
    });
}

/*
** Returns table rows in marked up IRC Log format
*/
Splunkbot.prototype.logsearch = function(usersearch, count, channel, time, timewindow) {
    var splunkbot = this
      , searchstr = "";
                      
    if (typeof time !== 'undefined') {
        timewindow = typeof timewindow !== 'undefined' ? timewindow : (15 * 60000); // Default window, 15 minutes
        var earliest = parseInt(time)-Math.round(timewindow/2,0);
        var latest = parseInt(time)+Math.round(timewindow/2,0);
        
        searchstr = "search index=* earliest="+splunkbot.makesplunktime(earliest)
                    +" latest="+splunkbot.makesplunktime(latest)+" | ";
    }
    
    searchstr += "search `irclogs` | search ";
    if (typeof channel !== 'undefined') {
        searchstr += " to="+channel+" ";
    }
    if (typeof usersearch !== 'undefined') {
        searchstr += usersearch.replace(/\|/g, "\\|");
    }
    
    searchstr += " (action=join OR action=part OR action=quit OR action=topic OR action=nick "
                  +"OR action=message OR action=notice) | ";
    if (typeof count !== 'undefined' && typeof time === 'undefined') {
        searchstr += "head "+count+" | "
    }
    if (typeof time !== 'undefined') {
        searchstr += " reverse | ";
    }
    searchstr += "fields _raw, _time, host, index, source, sourcetype, action, reason, "
                  +"channel, prettynick, names, oldnick, newnick, nick, server, text, to, topic";
    
    console.log("Searchstr: ", searchstr);
    splunkbot.search(searchstr, function(err, results) {
        if (err) {
            $('#errortext').text(err);
            $('#error').show();
            return;
        } else {
            // Disable spinner
            spinner.spin();
            $('#logboxtablebody').html(splunkbot.makeirclog(results));
        }
    });
}

/*
** Returns table rows in marked up IRC Log format
*/
Splunkbot.prototype.livesearch = function(channel) {
    var splunkbot = this
      , searchstr = "search `irclogs` | search to="+channel+" (action=join OR action=part OR action=quit "
                    +"OR action=topic OR action=nick OR action=message OR action=notice) | reverse | "
                    +"fields _raw, _time, host, index, source, sourcetype, action, reason, channel, "
                    +"prettynick, names, oldnick, newnick, nick, server, text, to, topic";
    
    console.log("Searchstr: ", searchstr);
    splunkbot.rtsearch(searchstr, function(err, results) {
        if (err) {
            $('#errortext').text(err);
            $('#error').show();
            return;
        } else {
            // Disable spinner
            spinner.spin();
            if (typeof results !== 'undefined') {
                $('#logboxtablebody').html($('#logboxtablebody').html()+splunkbot.makeirclog(results));
            }
        }
    });
}


/***************************************************
**      JQUERY & DOCUMENT FUNCTIONS               **
***************************************************/

$(document).ready(function() {
    splunkbot = new Splunkbot();
    
    // Decode query string, copy and pasted code from somewhere
    urlParams = {};
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.search.substring(1);

    while (e = r.exec(q))
       urlParams[d(e[1])] = d(e[2]);
});

/*
** Custom event emitted by Splunkbot constructor after the AJAX call to pull our credentials from the
** server has come back
*/
$(document).bind('creds_loaded', function() {
    // Example of how to bind to a pulldown
    //$("#countmenu > li").bind('click', function(e) { alert (e.target) } );
    
    // Check what page we're on
    var page = window.location.pathname.split('/')[1];
    if (page == 'urls') {
        // Create the spinner
        var opts = {
          lines: 12, // The number of lines to draw
          length: 7, // The length of each line
          width: 4, // The line thickness
          radius: 10, // The radius of the inner circle
          color: '#000', // #rgb or #rrggbb
          speed: 1, // Rounds per second
          trail: 60, // Afterglow percentage
          shadow: false, // Whether to render a shadow
          hwaccel: false // Whether to use hardware acceleration
        };
        var target = $("#spinner")[0];
        spinner = new Spinner(opts).spin(target);

        // Search splunk and output the results to the table
        splunkbot.lasturls(urlcount, channel);
    } else if (page == 'search') {
        // Create the spinner
        var opts = {
          lines: 12, // The number of lines to draw
          length: 7, // The length of each line
          width: 4, // The line thickness
          radius: 10, // The radius of the inner circle
          color: '#FFF', // #rgb or #rrggbb
          speed: 1, // Rounds per second
          trail: 60, // Afterglow percentage
          shadow: false, // Whether to render a shadow
          hwaccel: false // Whether to use hardware acceleration
        };
        var target = $("#logbox")[0];
        spinner = new Spinner(opts).spin(target);

        // Search splunk and output the results to the table
        splunkbot.logsearch(urlParams.q, urlParams.count || 10, urlParams.channel, 
                            urlParams.time, urlParams.timewindow);
    } else if (page == 'live') {
        // Create the spinner
        var opts = {
          lines: 12, // The number of lines to draw
          length: 7, // The length of each line
          width: 4, // The line thickness
          radius: 10, // The radius of the inner circle
          color: '#FFF', // #rgb or #rrggbb
          speed: 1, // Rounds per second
          trail: 60, // Afterglow percentage
          shadow: false, // Whether to render a shadow
          hwaccel: false // Whether to use hardware acceleration
        };
        var target = $("#logbox")[0];
        spinner = new Spinner(opts).spin(target);

        // Search splunk and output the results to the table
        splunkbot.livesearch(channel);
    }
});

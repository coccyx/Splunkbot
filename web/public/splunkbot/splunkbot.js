/*
** Constructor.
*/

Splunkbot = function() {
    var splunkbot = this;
    Async = Splunk.Async;
    utils = Splunk.Utils;
    UI = Splunk.UI;
    $.getJSON('/splunkcreds.json', function(data) {
        var http = new Splunk.ProxyHttp("/proxy");
        splunkbot.service = new Splunk.Client.Service(http, data);
        $(document).trigger('creds_loaded');
    });
    splunkbot.nicks = { };
    splunkbot.currentcoloridx = 4;
    splunkbot.currentliverow = 0;
    splunkbot.serverTZOffset = -serverTZOffset; // getTimezoneOffset returns positive for negative
                                                // timezones, so pacific is 8 instead of -8
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
** Returns current time compensated for timezone
*/
Splunkbot.prototype.gettime = function() {
    return new Date().getTime() - ((splunkbot.serverTZOffset - new Date().getTimezoneOffset()) * 60 * 1000);
}

/*
** Takes any date Javascript can parse and outputs HH:MM:SS
*/
Splunkbot.prototype.maketime = function(datestr) {
    var dtm = new Date(datestr);
    return this.pad(dtm.getHours(), 2)+':'+this.pad(dtm.getMinutes(), 2)+':'+this.pad(dtm.getSeconds(), 2);
}

/*
** Takes any date Javascriptcan parse and outputs UNIX timestamp at server time
*/
Splunkbot.prototype.makeunixtime = function(datestr) {
    return new Date(datestr).getTime() - ((splunkbot.serverTZOffset - new Date().getTimezoneOffset()) * 60 * 1000);
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
        row[fields.indexOf('text')] = typeof row[fields.indexOf('text')] !== 'string' ? "" : row[fields.indexOf('text')];
        // Escape any HTML affecting characters
        row[fields.indexOf('text')] = row[fields.indexOf('text')].replace(/&/g,'&amp;').                                         
                                                                    replace(/>/g,'&gt;').                                           
                                                                    replace(/</g,'&lt;').                                           
                                                                    replace(/"/g,'&quot;');
        
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

Splunkbot.prototype.makeirclog = function(results, startrow) {
    var retstr = ''
      , lastdate = '';
    if (results.rows.length > 0) {
        lastdate = this.makedate(results.rows[0][results.fields.indexOf('_time')]);
        for (var i=typeof startrow !== 'undefined' ? startrow : 0; i < results.rows.length; i++) {
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
Splunkbot.prototype.rtsearch = function(searchstr, callback, donecallback) {
    var splunkbot = this;
    var donecallback = donecallback || function () { };
    var MAX_COUNT = 10 * 60; // 10 Minutes
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
                    {earliest_time: "rt-1m", latest_time: "rt", auto_cancel: MAX_COUNT, max_time: MAX_COUNT}, 
                    done);
            },
            // The search is never going to be done, so we simply poll it every second to get
            // more results
            function(job, done) {
                var count = 0;
                
                // Since search will never be done, register an unload event which will close the search
                // if the window is closed
                $(window).unload(function() {
                    job.cancel(done);
                });
                
                Async.whilst(
                    // Loop for N times
                    function() { return MAX_COUNT > count; },
                    //function() { true; },
                    // Every second, ask for preview results
                    function(iterationDone) {
                        Async.sleep(1000, function() {
                            job.preview({}, function(err, results) {
                                if (err) {
                                    iterationDone(err);
                                }

                                // Up the iteration counter
                                count++;
                            
                                // Only do something if we have results
                                if (results.rows) {                                    
                                
                                    // console.log("========== Iteration " + count + " ==========");
                                    // var sourcetypeIndex = utils.indexOf(results.fields, "sourcetype");
                                    // var countIndex      = utils.indexOf(results.fields, "count");
                                    //                                 
                                    // for(var i = 0; i < results.rows.length; i++) {
                                    //     var row = results.rows[i];
                                    // 
                                    //     // This is a hacky "padding" solution
                                    //     var stat = ("  " + row[sourcetypeIndex] + "                         ").slice(0, 30);
                                    // 
                                    //     // Print out the sourcetype and the count of the sourcetype so far
                                    //     console.log(stat + row[countIndex]);   
                                    // }
                                    //                                 
                                    // console.log("=================================");
                                    
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
                        donecallback();
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
            console.log('Triggering primed event');
            $(document).trigger('primed');
        }
    });
}

/*
** Returns table rows in marked up IRC Log format
*/
Splunkbot.prototype.livesearch = function(channel) {
    var splunkbot = this
      , searchstr = "search `irclogs` | search to="+channel+" (action=join OR action=part OR action=quit "
                    +"OR action=topic OR action=nick OR action=message OR action=notice)  | "
                    +"fields _raw, _time, host, index, source, sourcetype, action, reason, channel, "
                    +"prettynick, names, oldnick, newnick, nick, server, text, to, topic"
      , primed    = false;
    
    console.log("Searchstr: ", searchstr);
    
    // Listen for primed event after we've completed the first search to populate the window
    // When we get it, fire off the realtime search.
    $(document).bind('primed', function () {
        console.log('Primed.  Kicking off realtime search.');
        
        var logbox = $("#logbox");
        logbox.animate({ scrollTop: logbox.prop("scrollHeight") - logbox.height() }, 1000);
        
        splunkbot.rtsearch(searchstr, function(err, results) {
            if (err) {
                $('#errortext').text(err);
                $('#error').show();
                return;
            } else {
                if (typeof results !== 'undefined') {
                    if (results.rows.length > splunkbot.currentliverow) {
                        $('#logboxtablebody').html($('#logboxtablebody').html()
                                                    +splunkbot.makeirclog(results, splunkbot.currentliverow++));
                        logbox.animate({ scrollTop: logbox.prop("scrollHeight") - logbox.height() }, 500);
                    }
                }
            }
        }, function() {
           $('#errortext').text('Realtime search has timed out.  Hit refresh to keep watching the live view.');
           $('#error').show(); 
        });
    });
    
    var time = splunkbot.gettime();
    splunkbot.logsearch("", undefined, channel, time, (30 * 60000));
}

Splunkbot.prototype.map = function() {
    // Channel variable gets set by page template
    $.getJSON('/splunkbot/map_'+encodeURIComponent(channel)+'.json', function(json) {
        spinner.spin();
        var labelType, useGradients, nativeTextSupport, animate;
        
        var ua = navigator.userAgent,
            iStuff = ua.match(/iPhone/i) || ua.match(/iPad/i),
            typeOfCanvas = typeof HTMLCanvasElement,
            nativeCanvasSupport = (typeOfCanvas == 'object' || typeOfCanvas == 'function'),
            textSupport = nativeCanvasSupport 
              && (typeof document.createElement('canvas').getContext('2d').fillText == 'function');
        //I'm setting this based on the fact that ExCanvas provides text support for IE
        //and that as of today iPhone/iPad current text support is lame
        labelType = (!nativeCanvasSupport || (textSupport && !iStuff))? 'Native' : 'HTML';
        nativeTextSupport = labelType == 'Native';
        useGradients = nativeCanvasSupport;
        animate = !(iStuff || !nativeCanvasSupport);
        
        var Log = {
          elem: false,
          write: function(text){
            if (!this.elem) 
              this.elem = document.getElementById('errortext');
            this.elem.innerHTML = text;
            this.elem.style.left = (500 - this.elem.offsetWidth / 2) + 'px';
          }
        };
        
        
        // Copy and pasted from http://thejit.org/static/v20/Jit/Examples/ForceDirected/example1.code.html
        var fd = new $jit.ForceDirected({  
          //id of the visualization container  
          injectInto: 'map',  
          //Enable zooming and panning  
          //by scrolling and DnD  
          Navigation: {  
            enable: true,  
            //Enable panning events only if we're dragging the empty  
            //canvas (and not a node).  
            panning: 'avoid nodes',  
            zooming: 10 //zoom speed. higher is more sensible  
          },  
          // Change node and edge styles such as  
          // color and width.  
          // These properties are also set per node  
          // with dollar prefixed data-properties in the  
          // JSON structure.  
          Node: {  
            overridable: true  
          },  
          Edge: {  
            overridable: true,  
            color: '#23A4FF',  
            lineWidth: 0.4  
          },  
          //Native canvas text styling  
          Label: {  
            type: labelType, //Native or HTML  
            size: 10,  
            style: 'bold'  
          },  
          //Add Tips  
          Tips: {  
            enable: true,  
            onShow: function(tip, node) {  
              //count connections  
              var count = 0;  
              node.eachAdjacency(function() { count++; });  
              //display node info in tooltip  
              tip.innerHTML = "<div class=\"tip-title\">" + node.name + "</div>"  
                + "<div class=\"tip-text\"><b>connections:</b> " + count + "</div>";  
            }  
          },  
          // Add node events  
          Events: {  
            enable: true,  
            type: 'Native',  
            //Change cursor style when hovering a node  
            onMouseEnter: function() {  
              fd.canvas.getElement().style.cursor = 'move';  
            },  
            onMouseLeave: function() {  
              fd.canvas.getElement().style.cursor = '';  
            },  
            //Update node positions when dragged  
            onDragMove: function(node, eventInfo, e) {  
                var pos = eventInfo.getPos();  
                node.pos.setc(pos.x, pos.y);  
                fd.plot();  
            },  
            //Implement the same handler for touchscreens  
            onTouchMove: function(node, eventInfo, e) {  
              $jit.util.event.stop(e); //stop default touchmove event  
              this.onDragMove(node, eventInfo, e);  
            },  
            //Add also a click handler to nodes  
            onClick: function(node) {  
              if(!node) return;  
              // Build the right column relations list.  
              // This is done by traversing the clicked node connections.  
              var html = "<h4>" + node.name + "</h4><b> connections:</b><ul><li>",  
                  list = [];  
              node.eachAdjacency(function(adj){  
                list.push(adj.nodeTo.name);  
              });  
              //append connections information  
              $jit.id('inner-details').innerHTML = html + list.join("</li><li>") + "</li></ul>";  
            }  
          },  
          //Number of iterations for the FD algorithm  
          iterations: 200,  
          //Edge length  
          levelDistance: 130,  
          // Add text to the labels. This method is only triggered  
          // on label creation and only for DOM labels (not native canvas ones).  
          onCreateLabel: function(domElement, node){  
            domElement.innerHTML = node.name;  
            var style = domElement.style;  
            style.fontSize = "0.8em";  
            style.color = "#ddd";  
          },  
          // Change node styles when DOM labels are placed  
          // or moved.  
          onPlaceLabel: function(domElement, node){  
            var style = domElement.style;  
            var left = parseInt(style.left);  
            var top = parseInt(style.top);  
            var w = domElement.offsetWidth;  
            style.left = (left - w / 2) + 'px';  
            style.top = (top + 10) + 'px';  
            style.display = '';  
          }  
        });  
        // load JSON data.  
        fd.loadJSON(json);  
        // compute positions incrementally and animate.  
        fd.computeIncremental({  
          iter: 40,  
          property: 'end',  
          onStep: function(perc){  
            Log.write(perc + '% loaded...');  
          },  
          onComplete: function(){  
            Log.write('done');  
            fd.animate({  
              modes: ['linear'],  
              transition: $jit.Trans.Elastic.easeOut,  
              duration: 2500  
            });  
          }  
        });
    });
}

Splunkbot.prototype.timeline = function(channel, timewindow) {
    if (typeof timewindow === 'undefined') {
        timewindow = 86400000;
    }
    var time = splunkbot.gettime();
    var earliest = parseInt(time)-timewindow;
        
    var searchTerm = "search earliest="+splunkbot.makesplunktime(earliest)+" `irclogs` | search to="+channel+" | bucket _time span=1h";
    console.log("searchTerm: ", searchTerm);
    
    var timeline = null;
    var timelineToken = Splunk.UI.loadTimeline("/splunkbot/client/splunk.ui.timeline.js", function() {
      // Once we have the charting code, create a chart.
      timeline = new Splunk.UI.Timeline.Timeline($("#timeline"));
    });
    
    // A small utility function to queue up operations on the chart
    // until it is ready.
    var updateTimeline = function(data) {
      var setData = function() {
        spinner1.spin();
        timeline.updateWithJSON(data);
      }

      if (timeline === null) {
        Splunk.UI.ready(timelineToken, function() { setData(); });
      }
      else {
        setData();
      }
    };

    Async.chain([
      // Login
      function(callback) { splunkbot.service.login(callback); },
      // Create the job
      function(success, callback) {
        splunkbot.service.jobs().create(searchTerm, {status_buckets: 300}, callback);
      },
      // Loop until the job is "done"
      function(job, callback) {
        var searcher = new Splunk.Searcher.JobManager(job.service, job);

        // Queue up timeline displays while we are querying the job
        searcher.onProgress(function(properties) {
          job.timeline({}, function(err, data) { 
            if (!err) updateTimeline(data);
          });
        });

        // Move forward once the search is done
        searcher.done(callback);
      },
      // Get the final timeline data
      function(searcher, callback) {
        searcher.job.timeline({}, callback);
      },
      // Update the timeline control
      function(timelineData, job, callback) {
        updateTimeline(timelineData);
        callback(null, job);
      }
    ],
    // And we're done, so make sure we had no error, and
    // cancel the job
    function(err, job) {
      if (err) {
        console.log(err);
        alert("An error occurred");
      }

      if (job) {
        job.cancel();
      }
    });
}

Splunkbot.prototype.loadcharts = function(channel, timewindow) {
    var splunkbot = this;
    
    var chartToken = Splunk.UI.loadCharting("/splunkbot/client/splunk.ui.charting.js", function() {
        splunkbot.toptalkers(channel, timewindow, chartToken);
        splunkbot.mostmentioned(channel, timewindow, chartToken);
    });
}

Splunkbot.prototype.toptalkers = function(channel, timewindow, chartToken) {
    var splunkbot = this;
    if (typeof timewindow === 'undefined') {
        timewindow = 86400000;
    }
    var time = splunkbot.gettime();
    var earliest = parseInt(time)-timewindow;
    
    var searchTerm = "search earliest="+splunkbot.makesplunktime(earliest)+" `irclogs` | search to="+channel
                    +" | chart count by nick";
    console.log("searchTerm: ", searchTerm);
    
    var chart = new Splunk.UI.Charting.Chart("#toptalkers", Splunk.UI.Charting.ChartType.PIE, false);
    
    Async.chain([
      // Login
      function(callback) { splunkbot.service.login(callback); },
      // Create the job
      function(success, callback) {
        splunkbot.service.jobs().create(searchTerm, {status_buckets: 300}, callback);
      },
      // Loop until the job is "done"
      function(job, callback) {
        var searcher = new Splunk.Searcher.JobManager(job.service, job);

        // Move forward once the search is done
        searcher.done(callback);
      },
      // Get the final results data
      function(searcher, callback) {
        searcher.job.results({json_mode: "column"}, callback);
      },
      // Update the chart
      function(results, job, callback) {  
        Splunk.UI.ready(chartToken, function() {
          spinner2.spin();
          chart.setData(results, { });
          chart.draw();
          callback(null, job);
        });
      }
    ],
    // And we're done, so make sure we had no error, and
    // cancel the job
    function(err, job) {
      if (err) {
        console.log(err);
        alert("An error occurred");
      }

      if (job) {
        job.cancel();
      }
    });
}

Splunkbot.prototype.mostmentioned = function(channel, timewindow, chartToken) {
    var splunkbot = this;
    if (typeof timewindow === 'undefined') {
        timewindow = 86400000;
    }
    var time = splunkbot.gettime();
    var earliest = parseInt(time)-timewindow;
    
    var searchTerm = "search earliest="+splunkbot.makesplunktime(earliest)+" `irclogs` | search action=message | "
                    +"rex field=text mode=sed \"s/://g\" | rex field=text mode=sed \"s/,//g\" | makemv delim=\" \" text | "
                    +"mvexpand text | rename text as nick| join nick [ search index=\"*\" sourcetype=\"splunkbot_logs\" "
                    +"action=names | makemv delim=\" \" names | mvexpand names | rename names as nick ] | chart count by nick";
    console.log("searchTerm: ", searchTerm);
    
    var chart = new Splunk.UI.Charting.Chart("#mostmentioned", Splunk.UI.Charting.ChartType.PIE, false);
    
    Async.chain([
      // Login
      function(callback) { splunkbot.service.login(callback); },
      // Create the job
      function(success, callback) {
        splunkbot.service.jobs().create(searchTerm, {status_buckets: 300}, callback);
      },
      // Loop until the job is "done"
      function(job, callback) {
        var searcher = new Splunk.Searcher.JobManager(job.service, job);

        // Move forward once the search is done
        searcher.done(callback);
      },
      // Get the final results data
      function(searcher, callback) {
        searcher.job.results({json_mode: "column"}, callback);
      },
      // Update the chart
      function(results, job, callback) {  
        Splunk.UI.ready(chartToken, function() {
          spinner3.spin();
          chart.setData(results, { });
          chart.draw();
          callback(null, job);
        });
      }
    ],
    // And we're done, so make sure we had no error, and
    // cancel the job
    function(err, job) {
      if (err) {
        console.log(err);
        alert("An error occurred");
      }

      if (job) {
        job.cancel();
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
    // Create for Spinner
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
    
    // Example of how to bind to a pulldown
    //$("#countmenu > li").bind('click', function(e) { alert (e.target) } );
    
    // Check what page we're on
    var page = window.location.pathname.split('/')[1];
    if (page == 'urls') {
        // Create the spinner
        var target = $("#spinner")[0];
        opts.color='#000';
        spinner = new Spinner(opts).spin(target);

        // Search splunk and output the results to the table
        splunkbot.lasturls(urlcount, channel);
    } else if (page == 'search') {
        // Create the spinner
        var target = $("#logbox")[0];
        spinner = new Spinner(opts).spin(target);
        
        var offsettime = parseInt(urlParams["time"]) + ((splunkbot.serverTZOffset - new Date().getTimezoneOffset()) * 60 * 1000);
        $("#timestr").html(splunkbot.makedate(offsettime)+" "+splunkbot.maketime(offsettime));

        // Search splunk and output the results to the table
        splunkbot.logsearch(urlParams.q, urlParams.count || 10, urlParams.channel, 
                            urlParams.time, urlParams.timewindow);
    } else if (page == 'live') {
        // Create the spinner
        var target = $("#logbox")[0];
        spinner = new Spinner(opts).spin(target);

        // Search splunk and output the results to the table
        splunkbot.livesearch(channel);
    } else if (page == 'map') {
        // Create the spinner
        var target = $("#map")[0];
        spinner = new Spinner(opts).spin(target);
        
        splunkbot.map();
    } else if (page == 'stats') {
        opts.color='#000';
        // Create the spinner
        var target = $("#timeline")[0];
        spinner1 = new Spinner(opts).spin(target);  
        target = $("#toptalkers")[0];
        spinner2 = new Spinner(opts).spin(target);
        var target = $("#mostmentioned")[0];
        spinner3 = new Spinner(opts).spin(target);     
        splunkbot.timeline(channel, urlParams.timewindow);
        splunkbot.loadcharts(channel, urlParams.timewindow);
    }
});

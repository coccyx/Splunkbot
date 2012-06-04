var util = require('util');
var splunk = require('./splunk');
var fs = require('fs');
WEBCONFIG = require('config').web;
var testresults = require('config').testresults;

function writeResults(results, channel) {
    var rows = results.rows;
    var fields = results.fields;
    var types = [ 'circle', 'star', 'triangle' ];
    var colors = [ "#800000", // dark red
                   "#FF0000", // red
                   "#FF00FF", // pink
                   "#008000", // teal
                   "#00FFFF", // cyan
                   "#008000", // green
                   "#00FF00", // bright green
                   "#000080", // green
                   "#0000FF", // blue
                   "#800080", // violet
                   "#808000", // dark yellow
                   "#FFFF00" ] // yellow

    // console.log(JSON.stringify(results, null, 2));
    
    var json = [ ];
    var currentNick = "";
    var adjacenciesIdx = 0;
    var nickIdx = 0;
    var color = "";
    var type = ""
    for (var i = 0; i < rows.length; i++) {
            
        // We've encountered a new nick, start a new JSON object
        if (currentNick != rows[i][fields.indexOf('nick')]) {
            if (i !== 0) {
                nickIdx++;
            }
            // console.log(util.format("%d currentNick: %s newNick: %s", i, currentNick, rows[i][fields.indexOf('nick')]));
            currentNick = rows[i][fields.indexOf('nick')];
            color = colors[nickIdx % 12];
            type = types[nickIdx % 3];
            adjacenciesIdx = 0;
            json[nickIdx] = { };
            json[nickIdx].id = currentNick;
            json[nickIdx].name = currentNick;
            json[nickIdx].data = { };
            json[nickIdx].data['$color'] = color;
            json[nickIdx].data['$type'] = type;
            json[nickIdx].data['$dim'] = 12;
            json[nickIdx].adjacencies = [ ];
        }
        // console.log(util.format("adjacenciesIdx %s", adjacenciesIdx));
        json[nickIdx].adjacencies[adjacenciesIdx] = { }
        json[nickIdx].adjacencies[adjacenciesIdx].nodeFrom = currentNick;
        json[nickIdx].adjacencies[adjacenciesIdx].nodeTo = rows[i][fields.indexOf('connection')];
        json[nickIdx].adjacencies[adjacenciesIdx].data = { };
        json[nickIdx].adjacencies[adjacenciesIdx].data['$color'] = color;
        json[nickIdx].adjacencies[adjacenciesIdx].data['$lineWidth'] = 0.5+Math.floor(rows[i][fields.indexOf('count')]/5);
        adjacenciesIdx++;
    }
    
    // console.log(json);
    
    fs.open(WEBCONFIG.path+'/web/public/splunkbot/map_'+channel+'.json', 'w', function (err, fd) {
        fs.write(fd, JSON.stringify(json, null, 2), null, 'utf8', function(){
            fs.close(fd);
        });
    });
}


for (var i=0; i < WEBCONFIG.channels.length; i++) {
    var channel = WEBCONFIG.channels[i];
    var searchstring = 'search `irclogs` | search [ search `irclogs` | search to='+channel+' | '
                        +'stats count by nick | sort 15 -count | fields nick | format ] | '
                        +'dedup nick | map [ search `irclogs` | search text="*$nick$*" | '
                        +'rename nick as connection | eval nick="$nick$" ] maxsearches=30 | '
                        +'stats count by nick, connection';

    // var searchstring = 'search `irclogs` | search to=#* | stats count by nick | sort 10 -count';

    // console.log("Search: "+searchstring);
    splunk.search(searchstring, function(err, results) {
        writeResults(results, channel);
    }, "-7d", "now");
}

// writeResults(testresults);
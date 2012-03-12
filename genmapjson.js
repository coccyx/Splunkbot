var util = require('util');
var splunk = require('./splunk');
var fs = require('fs');
WEBCONFIG = require('config').web;
var testresults = require('config').testresults;

function writeResults(results) {
    var rows = results.rows;
    var fields = results.fields;
    var types = [ 'circle', 'star', 'triangle' ];
    var colors = WEBCONFIG.colors;
    var colorMap = { "white": "#FFFFFF",
                     "darkred": "#800000",
                     "red": "#FF0000",
                     "pink": "#FF00FF",
                     "teal": "#008000",
                     "cyan": "#00FFFF",
                     "green": "#00FF00",
                     "brightgreen": "#00FF00",
                     "darkblue": "#000080",
                     "blue": "#0000FF",
                     "violet": "#800080",
                     "darkgrey": "#808080",
                     "grey": "#c0c0c0",
                     "darkyellow": "#808000",
                     "yellow": "#FFFF00" };

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
            color = colors[nickIdx % 16];
            type = types[nickIdx % 3];
            adjacenciesIdx = 0;
            json[nickIdx] = { };
            json[nickIdx].id = currentNick;
            json[nickIdx].name = currentNick;
            json[nickIdx].data = { };
            json[nickIdx].data['$color'] = colorMap[color];
            json[nickIdx].data['$type'] = type;
            json[nickIdx].data['$dim'] = 12;
            json[nickIdx].adjacencies = [ ];
        }
        // console.log(util.format("adjacenciesIdx %s", adjacenciesIdx));
        json[nickIdx].adjacencies[adjacenciesIdx] = { }
        json[nickIdx].adjacencies[adjacenciesIdx].nodeFrom = currentNick;
        json[nickIdx].adjacencies[adjacenciesIdx].nodeTo = rows[i][fields.indexOf('connection')];
        json[nickIdx].adjacencies[adjacenciesIdx].data = { };
        json[nickIdx].adjacencies[adjacenciesIdx].data['$color'] = colorMap[color];
        json[nickIdx].adjacencies[adjacenciesIdx].data['lineWidth'] = 0.5+Math.floor(rows[i][fields.indexOf('count')]/5);
        adjacenciesIdx++;
    }
    
    fs.open('web/public/splunkbot/map.json', 'w', function (err, fd) {
        fs.write(fd, JSON.stringify(json, null, 2), null, 'utf8', function(){
            fs.close(fd);
        });
    });
}



var searchstring = 'search `irclogs` | search [ search `irclogs` | search to=#* | '
                    +'stats count by nick | sort 15 -count | fields nick | format ] | '
                    +'dedup nick | map [ search `irclogs` | search text="*$nick$*" | '
                    +'rename nick as connection | eval nick="$nick$" ] maxsearches=30 | '
                    +'stats count by nick, connection';

// var searchstring = 'search `irclogs` | search to=#* | stats count by nick | sort 10 -count';
                    
splunk.search(searchstring, function(err, results) {
    writeResults(results);
}, "-7d", "now");

// writeResults(testresults);
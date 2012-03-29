
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , CONFIG = require('config').web
  , search = require('../search')
  , irclog = require('../irclog')
  , pagevars = { }
  , request = require('request');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    app.set('view options', { pretty: true });
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res){
    pagevars.page = 'index';
    res.render('index', pagevars);
});

app.get('/splunkcreds.json', function(req, res) {
    var creds = {
        scheme: CONFIG.splunk_scheme,
        host: CONFIG.splunk_host,
        port: CONFIG.splunk_port,
        username: CONFIG.splunk_username,
        password: CONFIG.splunk_password
    };
    res.send(creds); 
});

app.get('/urls/:urlcount?/:channel?', function(req, res, next) {
    pagevars.page = 'urls';
    pagevars.urlcount = req.params.urlcount || 10;
    pagevars.counts = CONFIG.counts;
    pagevars.channels = CONFIG.channels;
    pagevars.channel = req.params.channel || pagevars.channels[0];
    pagevars.search = 'Search';
    res.render('urls', pagevars);
});

app.get('/stats/:channel?', function(req, res, next) {
    pagevars.page = 'stats';
    pagevars.channels = CONFIG.channels;
    pagevars.channel = req.params.channel || pagevars.channels[0];
    pagevars.search = 'Search';
    
    pagevars.time = req.query.time;
    pagevars.timewindow = req.query.timewindow;    
    pagevars.times = CONFIG.stats_times;
    res.render('stats', pagevars);
});

app.get('/live/:channel?', function(req, res, next) {
    pagevars.page = 'live';
    pagevars.channels = CONFIG.channels;
    pagevars.channel = req.params.channel || pagevars.channels[0];
    pagevars.search = 'Search';
    pagevars.colors = CONFIG.colors;
    res.render('live', pagevars);
});

app.get('/search', function(req, res, next) {
    pagevars.page = 'search';
    pagevars.search = req.query.q || 'Search';
    pagevars.channel = req.query.channel;
    pagevars.time = req.query.time;
    if (typeof req.query.time !== 'undefined') {
        pagevars.timestr = irclog.makedate(parseInt(req.query.time))+" "+irclog.maketime(parseInt(req.query.time));
    }
    pagevars.timewindow = req.query.timewindow;
    pagevars.highlight = req.query.highlight;
    pagevars.count = req.query.count || 10;
    pagevars.counts = CONFIG.counts;
    pagevars.times = CONFIG.times;
    pagevars.colors = CONFIG.colors;
    res.render('search', pagevars);
});

app.get('/map/:channel?', function(req, res, next) {
    pagevars.page = 'map';
    pagevars.search = 'Search';
    pagevars.colors = CONFIG.colors;
    pagevars.channel = req.params.channel || pagevars.channels[0];
    res.render('map', pagevars);
});

app.all('/proxy/*', function (req, res) {
    // Copied largely from Splunk SDK code
    
    var error = {d: { __messages: [{ type: "ERROR", text: "Proxy Error", code: "PROXY"}] }};
    
    var writeError = function() {
        res.writeHead(500, {});
        res.write(JSON.stringify(error));
        res.end();
    };
    
    try {      
        var bodyarr = [];
        for (var key in req.body) {
            bodyarr.push(encodeURIComponent(key) + "=" + encodeURIComponent(req.body[key]));
        }
        var body = bodyarr.join("&");
        var destination = req.headers["X-ProxyDestination".toLowerCase()];
    
        var options = {
            url: destination,
            method: req.method,
            headers: {
                "Content-Length": req.headers["content-length"],
                "Content-Type": req.headers["content-type"],
                "Authorization": req.headers["authorization"],
            },
            body: body,
            jar: false
        };
        
        // console.log("Proxy Options: ", options);
        
        
        try {
            // console.log("Making Proxy request");
            request(options, function(err, response, data) {
                // console.log("Request came back.");
                try {
                    var statusCode = (response ? response.statusCode : 500) || 500;
                    var headers = (response ? response.headers : {}) || {};
                    res.writeHead(statusCode, headers);
                    res.write(data || JSON.stringify(err));
                    res.end();
                    // console.log("Proxy response: ", data || JSON.stringify(err))
                }
                catch (ex) {
                    // console.log("Caught exception: ", ex)
                    writeError();
                }
            });
        }
        catch (ex) {
            // console.log("Caught exception: ", ex)
            writeError();
        }
    }
    catch (ex) {
        // console.log("Caught exception: ", ex)
        writeError();
    }
});  


app.listen(CONFIG.port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

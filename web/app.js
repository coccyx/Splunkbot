
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , CONFIG = require('config').web
  , search = require('../search')
  , irclog = require('../irclog')
  , pagevars = { };

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
    res.render('stats', pagevars);
});

app.get('/live/:channel?', function(req, res, next) {
    pagevars.page = 'live';
    pagevars.channels = CONFIG.channels;
    pagevars.channel = req.params.channel || pagevars.channels[0];
    pagevars.search = 'Search';
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

app.listen(CONFIG.port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

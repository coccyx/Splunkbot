
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , CONFIG = require('config').web
  , logsearch = require('../logsearch');

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
    res.render('index');
});

app.get('/urls/:urlcount?', function(req, res, next) {
    urlcount = req.params.urlcount || 10;
    res.send("urlcount: "+urlcount);
});

app.listen(CONFIG.port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

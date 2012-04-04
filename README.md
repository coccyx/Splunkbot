# Splunkbot

Splunkbot is an IRC Bot, written in Javascript and running in Node.js.  It's designed to connect to multiple channels, multiple IRC networks, and then log the output of those channels in a structured form (JSON) to Splunk, via TCP, Splunk Storm via the REST API, or Logg.ly via their REST API.

Splunkbot also provides a web interface which provides a number of useful tools to the members of the channels it sits on.

* [Map](http://splunkbot.splunk.com/map "Splunkbot Map") - a visualization showing interactions on the channel and showing who talks to whom most often (IRC Command: !map)
* [Stats](http://splunkbot.splunk.com/stats "Splunkbot Stats") - a web interface to Splunk visualizations of channel activity (IRC Command: !stats)
* [URLs](http://splunkbot.splunk.com/urls "Splunkbot URLs") - a web interface showing the last X urls on a given channel (IRC Command: !lasturls <X>)
* [Live View](http://splunkbot.splunk.com/live "Splunkbot Live View") - a web interface showing a live view of the channel using Splunk's real-time search functionality (IRC Command: !live)
* [Search](http://splunkbot.splunk.com/ "Splunkbot Search") - allows users to search the history of the channel and provide an IRC-like interface to them over the web (IRC Command: !search <text, nick, etc>)

## Why Splunkbot?

Splunkbot was conceived and written for two purposes.  One, because it was **fun**.  I'm always looking to do spare time projects which align to my work, and this combined two passions of mine, Splunk and IRC.  Also, I really wanted to play with node.js.  Secondly, Splunkbot really shows off Splunk's strengths as a development platform, and I really wanted to showcase our new Javascript SDK.  This project highlights several aspects of Splunk that are worth mentioning:

* Splunk is very easy to get data into.  log.js shows that it's very simple to log to Splunk Enterprise over TCP or Splunk Storm over our REST API.
* Splunk is has a robust query language.  We are able to generate robust statistics via the query language and display them on charts and graphs simply, and we are able to do advanced analytics on things as complicated as semantics and language (see the who's talking to whom map)
* Splunk has an extensive REST API and SDKs to go along with that API.  Each area of the Splunkbot web GUI highlights a use case:
    * The URLs page shows a server side simple oneshot search that's displayed and rendered from the server side
    * The Stats page shows our Javascript SDK's ability to render excellent client-side charts and graphs
    * The Search page shows our ability to grab structured data via client side search and render in a format that looks just like an IRC client
    * The Live view page shows our excellent real time search abilities
    * The Map page shows our ability to integrate with third party visualization libraries to bring data in Splunk to live visually
    
## Installation instructions

### Get Splunk

Firstly, you'll need a copy of [Splunk](http://www.splunk.com/ "Splunk").  This can be easily obtained from our [Download](http://www.splunk.com/download "Splunk download") page.  Registration is required.  The download will give you a 60 day evaluation license of the Enterprise features, and after that period you can continue to index up to 500MB/day for free indefinitely.  Splunkbot is unlikely to consume 500MB/day of logs unless you were indexing hundreds of channels or more (#splunk on EFNet consumes a few megabytes a day).  Instructions are available on the website for how to install and configure Splunk.  I highly recommend the [Splunk Tutorial](http://docs.splunk.com/Documentation/Splunk/latest/User/WelcometotheSplunktutorial "Splunk Tutorial") as well.  Once you've got Splunk up and running, come back here.

### Get Node

You'll need a copy of node.js.  This was written on 0.6.2, but the current version should likely work.  How to obtain it and install it can be obtained from the [Node.js download page](http://nodejs.org/#download "Node.js download").

### Get Splunkbot

You then should obtain a copy of Splunkbot.  You can obtain a zipball of the code from Github:

    wget --no-check-certificate -O splunkbot.zip https://github.com/coccyx/Splunkbot/zipball/master
    
Or, you can clone a copy with Git, which would probably be preferable:

    git clone git://github.com/coccyx/Splunkbot.git
    
### Install Splunkbot dependencies

Once you've obtained a copy of Splunkbot, you'll need to first get all of the dependencies for Splunkbot to run.  Thankfully, Node has a totally awesome package management system that comes with Node, so this is very simple.  Inside the Splunk source directory, simply do:

    npm install
    cd /path/to/splunkbot/node_modules
    git clone git://github.com/coccyx/splunkstorm.git
    
### Splunk config

There's a few things you'll need to do to Splunk to get it to work with Splunkbot.  First, you'll need a user to log into Splunk with from Splunkbot itself and its web interface.  I recommend you add it from the command line.  Note this will prompt you for your admin username and password.

    sudo /path/to/splunk/bin/splunk add user splunkbot -password <pass> -role user
    
Make sure to replace /path/to/splunk with your path and <pass> with your password.
    
You'll also need to add some extra permissions to the splunkbot user for this to work properly.  You'll need to create an authorize.conf in $SPLUNK_HOME/etc/system/local with at least the following contents:

    [role_user]
    rtsearch = enabled
    srchMaxTime = 8640000
    
    [role_upquota]
    srchDiskQuota = 500
    srchMaxTime = 0

This enables the user role to have access to real time searches (required).  The upquota role should also be added to the Splunkbot user through the web GUI in Splunk in the chance that the splunkbot user runs over the stock quota of what can be searched in a given day.

### Splunk config for the Javascript SDK

For the Javascript SDK to work, you'll need to install an app in your Splunk install to allow the Javascript SDK to work.  Splunk's REST API by default outputs XML, but Javascript groks JSON much better, so the developers have written a Splunk app to translate the XML to JSON for the Javascript SDK.  This app needs to be installed in Splunk.  Assuming your Splunkbot install and Splunk are on the same box (if not, lets hope you can figure this out):

    sudo cp -R /path/to/splunkbot/node_modules/splunk-sdk/new_english /path/to/splunk/etc/apps
    sudo chown -R splunk /path/to/splunk/etc/apps/new_english
    sudo /path/to/splunk/bin/splunk restart
    sudo /path/to/splunk/bin/splunk enable new_english
    sudo /path/to/splunk/bin/splunk restart
    
If your Splunk host is different from your Splunkbot host, you'll also need to edit `$SPLUNK_HOME/etc/apps/new_english/default/json.conf` to include your IP.

### Adding the Splunkbot Splunk app

The Splunkbot app for Splunk adds an index and some default dashboards and searches we'll need.  To install the app, its very similar to the new_english app:

    sudo cp -R /path/to/splunkbot/splunkbot_app/* /path/to/splunk/etc/apps
    sudo chown -R splunk /path/to/splunk/etc/apps/splunkbot_app
    sudo /path/to/splunk/bin/splunk restart
    sudo /path/to/splunk/bin/splunk enable splunkbot_app
    sudo /path/to/splunk/bin/splunk restart

### Generating the map

To generate the map, we use an offline process that runs hourly to generate cached results to feed into the map.  This is optimal because the processing time required to do the search to feed the map is too long to make it feasible to run for every map display request.  In order to feed this though, we need a way to execute the search on a regular basis.  The easiest way is to add this to the cron.hourly directory:

    cp example_cron.sh cron.sh
    ln -s /path/to/splunkbot/cron.sh /etc/cron.hourly/splunkbot

**You'll need to edit cron.sh to match your installation!**
    
### Configuring Splunkbot

Splunkbot reads a JSON file in the config directory to determine where to sign in to IRC and which Splunk instances to connect to.  The example.json file contains all the information you should need to configure Splunkbot.  Copy the example.json to default.json and them modify it to match your needs.  

    cp /path/to/splunkbot/config/example.json /path/to/splunkbot/default.json

Example.json is reproduced here as well:

    {
      "log": [
          { "type": "syslog",
            "host": "<IP or hostname>",
            "port": <port, default 514> },
          { "type": "storm",
            "access_token": "<access_token obtained from Storm>",
            "project_id": "<project id obtained from Storm>",
            "sourcetype": "syslog",
            "source": "<source name>",
            "host": "<hostname>" },
          { "type": "loggly",
            "input_key": "<input_key from loggly>",
            "subdomain": "<subdomain from loggly>",
            "username": "<username>",
            "password": "<password>" }
      ],
      "irc": [
          {
            "server": "<server1>",
            "port": 6667,
            "nick": "<IRC nick>",
            "realName": "<IRC realname in /whois>",
            "userName": "<IRC username>",
            "stripColors": true,
            "channels": [ "<#channel1>", "<#channel2>" ],
            "version": "<CTCP VERSION reply>",
            "autoConnect": false,
            "retryCount": 10
          },
          {
            "server": "<server2>",
            "port": 6667,
            "nick": "<IRC nick>",
            "realName": "<IRC realname in /whois>",
            "userName": "<IRC username>",
            "stripColors": true,
            "channels": [ "<#channel1>", "<#channel2>" ],
            "version": "<CTCP VERSION reply>",
            "autoConnect": false,
            "retryCount": 10
          },
      ],
      "splunk": {
        "username": "<splunk username>",
        "password": "<splunk password>",
        "scheme": "https",
        "host": "<splunk host>",
        "port": <splunk management port, default 8089>
      },
      "web": {
        "port": <port for the webserver, needs to be >1024 to not run as root, I used 8080>,
        "host": "<hostname that will appear in IRC links, DNS entry or IP to this machine>",
        "splunk_scheme": "https",
        "splunk_host": "<splunk host>",
        "splunk_port": "<splunk management port, default 8089>",
        "splunk_username": "<splunk username>",
        "splunk_password": "<splunk password>",
        "maxnicklen": <max nick length in web views, I used 15>,
        "channels": [ "<#channel1>", "<#channel2>" ],
        "counts": [ 10, 25, 50, 100, 500, 1000 ],
        "colors": [ "white", "cyan", "darkgrey", "red", "brightgreen", "yellow", "pink", "teal", "green", "blue", "darkblue", "grey", "darkred", "darkyellow" ],
        "times": [ [ "15 minutes", 900000 ], [ "1 Hour", 3600000 ], [ "4 Hours", 14400000 ], [ "1 Day", 86400000 ] ],
        "stats_times": [ [ "1 Day", 86400000 ], [ "1 Week", 604800000 ], [ "1 Month", 2592000000 ] ],
        "path": "</path/to/splunkbot>",
        "server_tz_offset": 0
      }
    }
    
### Starting Splunkbot

You can configure node to run as a daemon, but for these purposes, I find it easiest to run Splunkbot via GNU screen.  This comes stock on most operating systems.  To start Splunkbot I recommend:

    screen
    cd /path/to/splunkbot
    node index.js
    
This assumes the node binary is already in your path.  

## Using Splunkbot

Congrats!  You should now have a working Splunkbot install.  To use Splunkbot, first see the IRC commands, which should like to your web GUI from within IRC.  Available commands:

* !map
    * Displays a relationship graph of questions on the channel
* !lasturls <X>
    * X is the number of URLS you'd like to see
* !search <text>
    * Searches channel logs for <text>
* !live
    * Displays a real-time view of the channel
* !stats
    * Displays realtime stats
    
Also, please check out the stock web GUI. This should be accessible via

    http://yourhost:8080/
    
Thanks and enjoy!
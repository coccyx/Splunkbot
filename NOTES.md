#Creating a pulldown in Bootstrap, Jade and Javascript:

##Inline script to fire on click
We set this at the top of our body or bottom, doesn't really matter, but fires after the document loads.

    script
      $(document).ready(function() {
        $.getJSON('/channels.json', function(data) {
          setChannel(data[0]);
          for (var i=0; i < data.length; i++) {
            function fixLoop(idx, channel) {
              $("#channel_"+idx).click( function() { setChannel(channel) } );
            }
            fixLoop(i, data[i]);
          }
        });
      });
  
##Script to refresh our table
SetChannel script which modifies the button and calls the actual javascript function we want to do work.  This is included from a linked JS file in the HTML:

    function setChannel(channel_in) {
        channel = channel_in;
        $("#channelbutton").text(channel_in);
        // Do table refresh here
    }

##Create the dropdown in Bootstrap
This is the dropdown menu itself in Jade:

    div(style='margin-left: -105px;').btn-group.span2
      a(href='#',id='channelbutton').btn.btn-success #{channels[0]}
      - if (channels.length > 1)
        a(data-toggle='dropdown',href='#',id='channelmenu').btn.btn-success.dropdown-toggle
          span.caret
        ul.dropdown-menu
          - for(var i=0;i<channels.length;i++)
            li
              a(href='#',id='channel_#{i}') #{channels[i]}

##Create a JSON call for the client to get a list of channels          
This is in our express.js code (usually app.js):

    app.get('/channels.json', function (req, res) {
        res.send(webutil.getChannels());
    });
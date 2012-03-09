var loggly = require('loggly');

var config = {
    subdomain: 'logbot',
    auth: {
      username: 'clint',
      password: 'Splunk1'
    }
};
var logger = loggly.createClient(config);

var message =  { 'message': 'Test Message' };

logger.log("0c6bf122-c477-4e67-a8e9-7162923a9ce3", JSON.stringify(message));
logger.log("0c6bf122-c477-4e67-a8e9-7162923a9ce3", "this is a test");



var storm = require('splunkstorm');
var logger = new storm.Log("KMdu5sxV8LZ4jUHinZBmGFhi6XyKM9t16lJHUIPiY3Fr5_KR7BicLNSFWcaCOzN0afNRLN34cdE=", "aa35900858ec11e1b39b12313d057545");
logger.send("this is a test, only a test");
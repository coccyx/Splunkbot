
Need to add user to Splunk to query from browser and the bot:

sudo /opt/splunk/bin/splunk add user splunkbot -password SpLunKB0t -role user

User role must have access to real time searches or Splunkbot user must have that access

Have to setup IPs in /etc/apps/new_english/local/json.conf
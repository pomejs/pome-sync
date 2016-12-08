var Client = require('mysql').Client;
var client = new Client();

client.host = '127.0.0.1';
client.user = 'xy';
client.password = 'dev';
client.database = 'pome';
 
exports.client = client;

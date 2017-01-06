var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var request = require('request');
var httpToWSBridge = null;

//app.use(function (req, res, next) {
//  console.log('middleware');
//  req.testing = 'testing';
//  return next();
//});
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  console.log('received request ', req.url);
  console.log('sending these to websocket ', req.query.words);
  httpToWSBridge.send(req.query.words);
  res.end("received request");    
});

app.get('/query', function(req, res){
  console.log('get route /query with words: ' + req.query.q);
  var googleOutput = queryGoogle(req.query.q,res);
  //console.log("google output is: " + googleOutput);
  //res.end("received request for /query with words: " + req.query.q);
});

app.ws('/', function(ws, req) {
    httpToWSBridge = ws;
    ws.on('message', function(msg) {
    console.log(msg);
    ws.send("received message: "+msg);
  });
  console.log('socket', req.testing);
});

app.listen(3000);

function queryGoogle(words,res) {
    var qParams = words.replace(/\ /g, "+");
    var googleURL = "https://www.google.com/#safe=active&q=" + qParams;
    console.log("googleURL: " + googleURL);
    var output = "";
    request(googleURL, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        //console.log(body) // Print the google web page.
        res.end(body);
     }
    });
    return output;
}
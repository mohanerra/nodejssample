var express = require('express');
var app = express();
var querystring = require('querystring');
var https = require('https');
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
  //var googleOutput = queryGoogle(req.query.q,res);
  //var googleOutput = queryMyTravel(req.query.q,res);
  //console.log("google output is: " + googleOutput);
  //res.end("received request for /query with words: " + req.query.q);
    
  var loginResponse = {};
  var requestCookies = "";
  var getMyTripsResponse = function(body,res) {
    res.end(body);    
  };

  var getLoginResponse = function (body,cookies,res) {
      loginResponse = body;
      requestCookies = cookies;
      console.log("Inside the callback getLoginResponse");
      console.log("loginResponse: " + loginResponse);
      console.log("requestCookies: " + requestCookies);
      
      console.log("TPGuid: " + loginResponse.tpGuid);
      console.log("securityToken: " + loginResponse.secToken);
      //res.end(loginResponse);
      queryMyTravel(loginResponse,requestCookies,res,getMyTripsResponse);
  };
    
  
  loginToTravel(req.query.q,res,getLoginResponse);
  //res.end(loginResponse);
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

function loginToTravel(words,res,callback) {
    var loginResponse = {};
    var requestCookies = "";
    var post_logindata = querystring.stringify({
      'userId' : '',
      'password': ''
    });
    var requestHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(post_logindata)   
    };
    var postOptions = {
        host : 'travel.americanexpress.com',
        port : 443,
        path : '/travel/authenticate',
        method : 'POST',
        headers: requestHeaders
    };
    
    //login
    console.log("sending login request with optionss: " + postOptions);
    var post_req = https.request(postOptions, function (response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
            loginResponse = JSON.parse(JSON.stringify(chunk));
            console.log('Response: ' + loginResponse);
            //res.end("response: " + loginResponse);
            var responseCookies = response.headers['set-cookie'];
            for(var i=0; i<responseCookies.length; i++){
                var oneCookie = responseCookies[i];
                oneCookie = oneCookie.split(';');
                requestCookies= requestCookies + oneCookie[0]+';';
            }
            console.log("cookies from response: " + requestCookies);
            callback(loginResponse,requestCookies,res);
      });
    });
    
    post_req.write(post_logindata);
    post_req.end();    
}

function queryMyTravel(loginResponse, requestCookies, res, callback) {
    var output = "";
    var myTripsResponse = "";
    
    //query myTrips
    var post_reqdata = querystring.stringify(loginResponse.encryptedCardsList);
    
    requestHeaders = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(post_reqdata),
        'Cookie': requestCookies
    };
    
    postOptions = {
        host : 'travel.americanexpress.com',
        port : 443,
        path : '/travel/customers/'+loginResponse.tpGuid+'?securityToken='+loginResponse.secToken,
        method : 'POST',
        headers: requestHeaders
    };  
    
    console.log("sending post request with optionss: " + postOptions);
    console.log("sending post request to URI: " + postOptions.path);
    post_req = https.request(postOptions, function (response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
        myTripsResponse = JSON.parse(JSON.stringify(chunk));
        console.log('Response: ' + myTripsResponse);
        callback(myTripsResponse,res);
      });
    });
    
    post_req.write(post_reqdata);
    post_req.end();
    
    
    return output;
}
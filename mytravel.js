var express = require('express');
var app = express();
var querystring = require('querystring');
var https = require('https');
var expressWs = require('express-ws')(app);
var request = require('request');
var bodyParser = require('body-parser');
var httpToWSBridge = null;
var todos = [];
var todoItems = {};

//app.use(function (req, res, next) {
//  console.log('middleware');
//  req.testing = 'testing';
//  return next();
//});
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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
      var output = "<html><head><link rel='stylesheet' href='https://travel.americanexpress.com/ctnwt/assets/trips/styles/mytrips-min.css?q=-2059341902' type='text/css' /><link media='all' type='text/css' href='https://www.aexp-static.com/nav/ngn/css/inav_responsive.css' rel='stylesheet' /><link media='all' type='text/css' href='https://www.aexp-static.com/nav/ngn/css/inav_travel.css' rel='stylesheet' /><script language='javascript' type='text/javascript'>alert('Hi');</script><title>My Trips</title><body><div id='tripsResponse' style='display:block'>" + body + "</div></body></html>";
      res.end(output);    
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
    
  if(req.query.q.indexOf("todo")!=-1){
    console.log("received inquiry for todo");  
    todoItems.items = todos;
    res.end(JSON.stringify(todoItems));
  } else {
    loginToTravel(req.query.q,res,getLoginResponse);
  }
  //res.end(loginResponse);
});

app.post("/todo", function(request,response){
   var actionItem = request.body.actionItem; 
   console.log("Received actionItem: " + actionItem);
   todos.push(actionItem);
   console.log("Todo Items: " + todos.toString());
   response.end(todos.toString());
});

app.get("/todo", function(request,response){
   todoItems.items = todos;
   console.log("Todo Items: " + JSON.stringify(todoItems));
   response.end(JSON.stringify(todoItems));
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
        var resBody = "";
        response.on('data', function (chunk) {
            //loginResponse = JSON.parse(JSON.stringify(chunk));
            //console.log('Response: ' + loginResponse);
            //res.end("response: " + loginResponse);
            resBody += chunk; 
            var responseCookies = response.headers['set-cookie'];
            for(var i=0; i<responseCookies.length; i++){
                var oneCookie = responseCookies[i];
                oneCookie = oneCookie.split(';');
                requestCookies= requestCookies + oneCookie[0]+';';
            }
            console.log("cookies from response: " + requestCookies);
            
      });
        response.on('end', function(){
            console.log("### resBody: " + resBody);
            console.log("resBody isJson: " + isJson(resBody));
            loginResponse = JSON.parse(resBody);
            console.log('### LoginResponse: ' + loginResponse);
            if(isJson(loginResponse)){
                console.log("#### loginResponse is a Json ####");
            } else {
                console.log("#### loginResponse is NOT a Json ####");
            }
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
    var post_reqdata = JSON.stringify(loginResponse.encryptedCardsList);
    console.log("post_reqdata: " + post_reqdata);
    
    //'Content-Type': 'application/json',
    //    'Content-Length': Buffer.byteLength(post_reqdata),
    requestHeaders = {
        'Content-Type': 'text/html',
        'Cookie': requestCookies
    };
    
    postOptions = {
        host : 'travel.americanexpress.com',
        port : 443,
        path : '/travel/customers/'+loginResponse.tpGuid+'/trips?securityToken='+loginResponse.secToken,
        method : 'POST',
        headers: requestHeaders
    }; 
    
    getOptions = {
        host : 'travel.americanexpress.com',
        port : 443,
        path : '/my-trips?inav=travel_mytrips_gem',
        method : 'GET',
        headers: requestHeaders        
    };
    
    console.log("sending get request with optionss: " + JSON.stringify(getOptions));
    console.log("sending post request to URI: " + getOptions.path);
    post_req = https.request(postOptions, function (response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
        myTripsResponse = JSON.parse(JSON.stringify(chunk));
        console.log('Response: ' + myTripsResponse);
        callback(myTripsResponse,res);
      });
    });
    
    //post_req.write(post_reqdata);
    //post_req.end();
    
    var getReq = https.request(getOptions, function(response) {
        var resBody = "";
        response.on('data', function(chunk){
            resBody += chunk;    
        });
        
        response.on('end', function(){
            myTripsResponse = resBody;
            callback(myTripsResponse,res);
        });
    });
    getReq.end();
    return output;
}

function isJson(obj) {
    var t = typeof obj;
    console.log("##### Inside isJson. typeof val: " + t);
    return ['boolean', 'number', 'string', 'symbol', 'function'].indexOf(t) == -1;
}
var WebSocketServer = require('websocket').server;
var http = require('http');
var reqUrl = require('url');
var httpToWsBridge = null;


var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
    console.log("request is: " + request.url);
 var headers = request.headers;
  var method = request.method;
  var url = request.url;
  var body = [];
  request.on('error', function(err) {
    console.error(err);
  }).on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body).toString();
    // BEGINNING OF NEW STUFF

    response.on('error', function(err) {
      console.error(err);
    });

    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    // Note: the 2 lines above could be replaced with this next one:
    // response.writeHead(200, {'Content-Type': 'application/json'})

    var responseBody = {
      headers: headers,
      method: method,
      url: url,
      body: body
    };

    //response.write(JSON.stringify(responseBody));
    var queryData = reqUrl.parse(request.url, true).query;
    
      console.log("queryData: " + queryData.req);
    if(request.url === "/favicon.ico") {
        console.log("received request for favicon from browser. Doing nothing");
    } else { 
        httpToWsBridge.sendUTF("request received is: " + queryData.req);
    }
    response.end("request received is: " + queryData.req);
    // Note: the 2 lines above could be replaced with this next one:
    // response.end(JSON.stringify(responseBody))

    // END OF NEW STUFF
      
  });   
});
    
server.listen(1337, function() {
    console.log("inside server.listen");
});

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

// WebSocket server
wsServer.on('request', function(request) {
    console.log("inside wsServer.On()");
    var connection = request.accept(null, request.origin);
    httpToWsBridge = connection;
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
        console.log("inside connection.On()");
        if (message.type === 'utf8') {
            // process WebSocket message
            console.log("processing websocket message");
            connection.sendUTF("received websocket message");
        }
    });

    connection.on('close', function(connection) {
        // close user connection
    });
});
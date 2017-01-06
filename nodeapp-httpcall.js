var express = require('express');
var app = express();
var request = require('request');

app.set('port', (process.env.PORT || 3100));
app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.send('Hello World!');
  queryPage(response);
})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});

function queryPage(res) {
    var intent = { 
        name: "KnowledgeSearchIntent",
        slots: {
                  Search: {
                     name: "Search",
                     value: "what is node js"
                  }
        }
      };
    var qParams = intent.slots.Search.value.replace(/\ /g, "+");
    var queryURL = "http://localhost:3000?words=" + qParams;
    console.log("queryURL: " + queryURL);
    var output = "";
    request(queryURL, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log(body) // Print the google web page.
        res.end(body);
     }
    });
    return output;
}

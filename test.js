const productIndex = 'pdm'
const productDataType = 'product'

let body = { "properties": {
                "product_name":  {
                    "type": "string",
                    "index": "analyzed",
                    "fields": {
                        "raw": {
                            "type": "string",
                            "index": "not_analyzed"
                            }
                    }
                }
              }
            }
let objOptions = {
  host: 'localhost',
  path: productIndex + '/' + productDataType + '/' + '_mapping',
  port: '9200',
  auth: 'elastic:changeme'

  // host: '7e94c6196993fd6c3d570a3d40e100d1.us-east-1.aws.found.io',
  // path: productIndex + '/' + productDataType + '/' + "_mapping",
  // port: '9243',
  // auth: 'elastic:SwmLSQli9PvtUNsm63Ce7dpr'
  // This is the only line that is new. `headers` is an object with the headers to request
  // headers: {'custom': 'Custom Header Demo works'}
}
console.log(objOptions)
console.log('http//'+objOptions.auth+'@'+objOptions.host+':'+objOptions.port+'/'+objOptions.path);
var request = require('request');
request.post('http://'+objOptions.auth+'@'+objOptions.host+':'+objOptions.port+'/'+objOptions.path,{data: body}, function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:', body); // Print the HTML for the Google homepage.
})

// var Handlebars = require('handlebars');
//
// var source = "<p>Hello, my name is {{name}}. I am from {{hometown}}. I have " +
//     "{{kids.length}} kids:</p>" +
//     "<ul>{{#kids}}<li>{{name}} is {{age}}</li>{{/kids}}</ul>";
// var template = Handlebars.compile(source);
//
// var data = { "name": "Alan", "hometown": "Somewhere, TX",
//     "kids": [{"name": "Jimmy", "age": "12"}, {"name": "Sally", "age": "4"}]};
// var result = template(data);
//
//
// var fs = require('fs');
//     fs.writeFile("test.html", result, function(err) {
//     if(err) {
//         return console.log(err);
//     }
// });

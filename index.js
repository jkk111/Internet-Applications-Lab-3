let http = require('http')
let server = http.createServer();
server.listen(process.env.PORT || 80);

let Router = require('./Router')

let r = new Router(server);

require('./DirectoryService')(r)

if(process.env.ENVIRONMENT === 'DEVELOPMENT') {
  require('./Debug')(r);
}
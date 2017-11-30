let http = require('http')
let server = http.createServer();
server.listen(1995)

let Router = require('./Router')

let r = new Router(server);

r.on('message', (ws, m) => {
  console.info('DEBUG: Message Received \'%s\' \'%s\'', ws.id, JSON.stringify(m))
})
let ws = require('ws');

let conn = new ws('ws://localhost');

let message = (type, body, extra = {}) => {
  let obj = { ...extra, type, message: body }
  return Buffer.from(JSON.stringify(obj));
}

let ident = message('ident', 'test-client');
let lookup = message('lookup', 'memes', { callback: true })

conn.on('open', () => {
  conn.send(ident)
  conn.send(lookup)

  conn.on('message', (d) => console.log(d.toString()))
})
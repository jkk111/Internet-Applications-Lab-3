/*
 * Websockets will be used for events passing, lower overhead than
 * creating a new TCP connection for each message
 */


let ws = require('ws')
let crypto = require('crypto')

let random_id = () => {
  return crypto.randomBytes(32).toString('base64')
}

// Router class, takes a http server, attaches a websocket listener,
// then connects as a client to other nodes in the network
class Router {
  constructor(server, bootstrap = []) {
    this.handlers = {};
    this.connected_nodes = {};
    this.callbacks = {};
    this.id = random_id();
    this.srv = new ws.Server({ server });
    let m = JSON.stringify({ type: 'ident', message: this.id });
    this.srv.on('connection', this.connection.bind(this));

    for(var node of bootstrap) {
      this.connect(node);
    }
  }
  // { "type": "ident", "message": "test-ident" }
  _incoming(sender, m) {
    this.__internal_on_message__(sender, m);

    let callback = undefined;

    if(m.callback) {
      callback = (message) => {
        let mesg = Buffer.from(JSON.stringify({ id: random_id(), callback_id: m.id, type: 'callback', message }))
        sender.send(mesg);
      }
    }

    if(!m.cancelled && this.handlers[m.type]) {
      console.log('raw', m);
      for(var handler in this.handlers[m.type]) {
        handler = this.handlers[m.type][handler]
        handler(sender, m, callback);
      }
    }

    if(!m.cancelled) {
      if(this.handlers['message']) {
        for(var handler in this.handlers['message']) {
          handler = this.handlers['message'][handler];
          handler(sender, m, callback);
        }
      }
    }
  }

  __send_ready__(buf) {
    for(var id in this.connected_nodes) {
      let client = this.connected_nodes[id]
      if(client.readyState === ws.OPEN) {
        client.send(buf)
      }
    }
  }

  send(type, message, callback) {
    let id = random_id();
    let m = Buffer.from(JSON.stringify({ type, id, message, callback: !!callback }));
    let clear_func = null;
    if(callback) {
      this.callbacks[id] = callback;
      clear_func = () => {
        delete this.callbacks[id];
      }
    }

    this.__send_ready__(m);
    return clear_func;
  }

  __forward__(sender, m) {
    m.sender = sender.id
    this.__send_ready__(Buffer.from(JSON.stringify(m)))
  }

  __internal_on_message__(sender, m) {
    // Idea here is we can cancel propagation of a message if needed
    // Modify as necessary
    // And close the connection if desired

    if(m.type === 'ident') {
      if(!sender.id) {
        sender.id = m.message;
        sender.identified = true;
        this.connected_nodes[sender.id] = sender;
      }
    } else {
      if(!sender.identified) {
        console.warn('Unidentified Client, Dropping', JSON.stringify(m))
        sender.close();
        return;
      }
      if(sender.id === m.sender || m.sender === undefined) {
        if(m.type === 'close') {
          sender.close();
          m.cancelled = true;
        } else if(m.type === 'callback') {
          let callback = this.callbacks[m.callback_id];
          if(callback) {
            callback(sender, m.message);
          }
        }
      }
    }
    this.__forward__(sender, m)
  }

  on(type, cb) { // Register a listener for a specific type of message.
    let id = random_id();
    if(!this.handlers[type]) {
      this.handlers[type] = {};
    }
    this.handlers[type][id] = cb

    let cancel = () => {
      delete this.handlers[type][id]
    }

    return cancel
  }

  once(type, cb) {
    let cancel = this.on(type, (...args) => {
      cancel();
      cb(...args);
    })
  }

  on_message(ws, message) {
    try {
      message = JSON.parse(message)
    } catch(e) {
      console.error("ERROR: Badly Formed Message")
      ws.close();
      return;
    }
    this._incoming(ws, message);
  }

  on_close(ws) {
    if(this.connected_nodes[ws.id]) {
      delete this.connected_nodes[ws.id];
    }
    let d = { type: 'close', sender: ws.id };
    this._incoming(ws, d);
  }

  connection(socket) {
    let m = JSON.stringify({ type: 'ident', message: this.id })
    socket.send(Buffer.from(m));
    socket.on('message', this.on_message.bind(this, socket))
    socket.on('close', this.on_close.bind(this, socket))
  }

  connect(host) {
    let conn = new ws(host);

    ws.on('open', () => {
      this.connection(socket);
    })
  }
}

module.exports = Router
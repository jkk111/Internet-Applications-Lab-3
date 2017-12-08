let request = require('request');
let crypto = require('crypto')
let nodes = require('./bootstrap.json');

let tmp_dir = __dirname + '/tmp/';

let fs = require('fs')

let ws = require('ws')

let event_socket = null;

let random_id = () => {
  return crypto.randomBytes(16).toString('hex');
}

try {
  fs.mkdirSync(tmp_dir)
} catch(e) {}

exports = {};

let next_node = () => {
  if(nodes.length === 0)
    throw new Error("Out of available nodes");
  return nodes[0];
}

// Gets a listing of all files
exports.ls = async() => {
  return new Promise((resolve) => {
    let url = `http://${next_node()}/ls`;
    request(url, { json: true }, (err, data, body) => {
      resolve(body);
    });
  })
};

// Gets a file by hash, returns the file path;
exports.get = (hash) => {
  return new Promise((resolve) => {
    let url = `http://${next_node()}/by_hash/${hash}`;

    let ws = fs.createWriteStream(tmp_dir + hash)
    let req = request(url);

    req.pipe(ws);

    ws.on('close', () => {
      resolve(tmp_dir + hash);
    })
  })
}

exports.get_latest = (id) => {
  return new Promise((resolve) => {
    let url = `http://${next_node()}/by_id/?id=${encodeURIComponent(id)}`;
    console.log(url);
    let ws = fs.createWriteStream(tmp_dir + id)
    let req = request(url);

    req.pipe(ws);

    ws.on('close', () => {
      resolve(tmp_dir + id);
    })
  })
}

exports.add = async(path, value, extra = {}) => {
  console.log(path, value);
  return new Promise(async(resolve) => {
    let url = `http://${next_node()}/upload`
    console.log(url, path, value, extra);
    let req = request.post({
      url,
      method: 'POST',
      formData: {
        file: {
          value,
          options: { filename: path }
        },
        path: path,
        extra: JSON.stringify(extra)
      },
      json: true
    }, async(e, d, body) => {
      console.log(e, d, body);
      resolve(body);
    })
  })
}

exports.update = async(id, value, extra = {}) => {
  console.log('update', id)
  return new Promise(async(resolve) => {
    console.log("promise")
    let url = `http://${next_node()}/update`

    console.log(extra)

    let req = request({
      url,
      method: 'POST',
      formData: {
        file: {
          value,
          options: { filename: id }
        },
        id,
        extra: JSON.stringify(extra)
      }
    })

    req.on('response', async() => {
      resolve();
    })
  });
}

let hello = () => {
  let id = random_id();
  let m = { type: 'ident', message: id }
  return Buffer.from(JSON.stringify(m));
}

exports.on_event = (cb) => {
  if(!event_socket) {
    let ws_url = `ws://${next_node()}`;
    event_socket = new ws(ws_url)
    console.log(event_socket)
    event_socket.on('open', () => {
      event_socket.send(hello())
    })


  }

  event_socket.on('message', (m) => {
    try {
      m = JSON.parse(m)
      cb(m);
    } catch(e) {}
  });
}

module.exports = exports;
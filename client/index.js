let request = require('request-promise');

let nodes = require('./bootstrap.json');

let tmp_dir = __dirname + '/tmp/';

let fs = require('fs')

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
  let url = `http://${next_node()}/ls`;
  let resp = await request(url);
  return resp;
};

// Gets a file by hash, returns the file path;
exports.get = (hash) => {
  return new Promise((resolve) => {
    let url = `http://${next_node()}/by_hash/${hash}`;

    let ws = fs.createWriteStream(tmp_dir + hash)
    let req = request(url);

    req.pipe(ws);

    ws.on('close', () => {
      console.log(tmp_dir + hash);
      resolve(tmp_dir + hash);
    })
  })
}

exports.add = async() => {

}

exports.update = async() => {

}

module.exports = exports;
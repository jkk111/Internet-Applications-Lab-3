let fs = require('fs')
let request = require('request')

/*
 Some thoughts on my replication strategy
 Emit when a new version of a file is available,
 first node to respond then clones the file,
 this ensures at least 2 nodes in the network have the file,
 for other nodes, expression of interest will be used to fetch files,
 ie. only fetch files when a connected client is asking for it.
 */

module.exports = (router) => {
  let obtain_file = (ws, m) => {
    router.request(m.hash, async(host) => {
      let url = `http://${host}/by_hash/${m.hash}`;
      let resp = request(url);
      let file_path = `./files/${m.hash}`;
      let tmp_file_path = `${file_path}.tmp`;
      resp.pipe(fs.createWriteStream(file_path))
      resp.on('end', () => {
        fs.renameSync(tmp_file_path, file_path);
      })
    });
  }

  router.on('add', (ws, m, callback) => {

  })

  // router.on('add', obtain_file);
  // router.on('update', obtain_file)
};
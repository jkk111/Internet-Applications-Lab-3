let fs = require('fs')
let request = require('request')

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

  router.on('add', obtain_file);
  router.on('update', obtain_file)
};
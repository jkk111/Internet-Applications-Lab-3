let http = require('http')

let express = require('express')
let crypto = require('crypto')
let app = express();

let fs = require('fs')
let multer = require('multer');
let upload = multer({ dest: './uploads' });

let db = require('./db')();

let server = http.createServer(app);
server.listen(process.env.PORT || 80);

let Router = require('./Router')

let r = new Router(server);

app.post('/upload', upload.single('file'), (req, res) => {
  let { path } = req.body;
  console.log(path, req.file);

  let hash = crypto.createHash('sha256');
  let rs = fs.createReadStream(req.file.path);
  rs.on('readable', () => {
    let d = rs.read();
    if(d) {
      hash.update(d);
    } else {
      let sha = hash.digest('hex');
      let save_path = `./files/${sha}`
      fs.renameSync(req.file.path, save_path)
      let id = r.random_id();
      db.insert(id, path, sha);
      let m = Buffer.from(JSON.stringify({
        id: r.random_id(),
        type: 'add',
        file_id: id,
        filename: path,
        hash: sha
      }));
      r.__send_ready__(m);
    }
  })

  res.send();
})

app.get('/by_path', (req, res, next) => {
  db.lookup(req.query.path, (data) => {
    if(data.length) {
      let hash = data[0].hash;
      let name = data[0].path;

      name = name.slice(name.lastIndexOf('/') + 1);
      try {
        fs.accessSync(`./files/${hash}`, fs.constants.R_OK);
        res.download(`./files/${hash}`, name);
      } catch(e) {
        // Right So this is going to require proxying from a server that can satisfy the request
        r.send('lookup', hash, (ws) => {
          // So we care about the source of our responder here
          // I assume that there is a background download, somewhere, so I won't cache the response!
          // However in a more expression of interest system, we could cache the result here while writing to the client.
          let url = `http://${ws.connection.remoteAddress}/by_path`;
          let proxied = request(url, { qs: { path: req.query.path } })
          proxied.pipe(res);
        });
      }
    } else {
      next();
    }
  });
})

app.get('/by_hash/:hash', (req, res, next) => {
  try {
    let path = `./files/${req.params.hash}`;
    fs.accessSync(path, fs.constants.R_OK);
    console.log(req.params.hash);
    next();
  } catch(e) {
    console.log(e);
    next(e);
  }
})

app.use('/by_hash', express.static('./files'));

require('./DirectoryService')(db, r)

if(process.env.ENVIRONMENT === 'DEVELOPMENT') {
  require('./Debug')(r);
}
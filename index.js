let http = require('http')

let os = require('os')

let bootstrap = require(process.env.BOOTSTRAP_FILE || './bootstrap.json')

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

let r = new Router(server, bootstrap);

let Hash = (path, cb) => {
  let hash = crypto.createHash('sha256');
  let rs = fs.createReadStream(path);
  rs.on('readable', () => {
    let d = rs.read();
    if(d) {
      hash.update(d);
    } else {
      let sha = hash.digest('hex');
      let save_path = `./files/${sha}`
      fs.renameSync(path, save_path)
      cb(sha);
    }
  });
}

app.post('/upload', upload.single('file'), (req, res) => {
  let { path } = req.body;

  console.log(req.body, req.file)

  console.log(path, req.file);
  let id = r.random_id();
  Hash(req.file.path, (sha) => {
    console.log('here')
    db.insert(id, path, sha);
      let m_id = r.random_id();
      let m = Buffer.from(JSON.stringify({
        id: m_id,
        type: 'add',
        file_id: id,
        filename: path,
        hash: sha,
        callback: true
      }));

      let replicated = false;

      let clear = r.__send_ready__(m, m_id, (ws, m, cb) => {
        if(replicated) return;
        replicated = true;
        clear();
        cb();
      });
    })

  res.send({ id });
})

app.post('/update', upload.single('file'), (req, res) => {
  let { id } = req.body;
  Hash(req.file.path, (sha) => {
    let m_id = r.random_id();

    db.update(sha, id, () => {
      let m = Buffer.from(JSON.stringify({
        id: m_id,
        type: 'update',
        file_id: id,
        hash: sha,
        callback: true
      }));


      let replicated = false;

      let clear = r.__send_ready__(m, m_id, (cb) => {
        if(replicated) return;
        replicated = true;
        clear();
        cb();
      })
    })
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
          let dest = `./files/${hash}`;
          let proxied_path = `${dest}.${r.random_id()}.tmp`;
          proxied.pipe(fs.createWriteStream(proxied_path));
          proxied.pipe(res);

          proxied.on('response', () => {
            fs.renameSync(proxied_path, dest);
            res.download(`./files/${hash}`, name);
          })
        });
      }
    } else {
      next();
    }
  });
})

app.get('/by_hash/:hash', (req, res, next) => {
  let { hash } = req.params.hash;
  try {
    let path = `./files/${req.params.hash}`;
    fs.accessSync(path, fs.constants.R_OK);
    console.log(req.params.hash);
    next();
  } catch(e) {
    // TODO: Add Functionality to fetch the file and proxy to user
      r.send('lookup', hash, (ws) => {
        // So we care about the source of our responder here
        // I assume that there is a background download, somewhere, so I won't cache the response!
        // However in a more expression of interest system, we could cache the result here while writing to the client.
        let url = `http://${ws.connection.remoteAddress}/by_path`;
        let proxied = request(url, { qs: { path: req.query.path } })
        let dest = `./files/${hash}`;
        let proxied_path = `${dest}.${r.random_id()}.tmp`;
        proxied.pipe(fs.createWriteStream(proxied_path));
        proxied.pipe(res);

        let name = file.path.slice(name.lastIndexOf('/') + 1);
        proxied.on('response', () => {
          fs.renameSync(proxied_path, dest);
          next();
        })
    });
  }
})

app.use('/by_hash', express.static('./files'));

app.get('/by_id', (req, res) => {
  let { id } = req.query;
  db.lookup_id(id, (file) => {
    file = file.reverse()[0]
    console.log(id, file);
    res.redirect(`/by_hash/${file.hash}`);
  })
})

app.get('/ls', (req, res) => {
  db.ls(rows => { res.send(rows) })
});

require('./DirectoryService')(db, r)

if(process.env.ENVIRONMENT !== 'PRODUCTION') {
  require('./Debug')(r);
}
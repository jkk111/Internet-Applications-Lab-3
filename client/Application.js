let client = require('./');

let express = require('express')
let app = express();
let ws = require('ws');
let fs = require('fs')
let multer = require('multer')
let upload = multer({ dest: './' })

let http = require('http')
let server = http.createServer(app);

server.listen(8432);
let socket = new ws.Server({ server });

client.on_event((m) => {
  socket.clients.forEach((c) => {
    console.log('heherkehoahds\n\n\n\n', c.readyState)
    if(c.readyState === ws.OPEN) {
      c.send(JSON.stringify(m));
    }
  })
})

app.get('/file/:id', async(req, res) => {
  res.send(fs.readFileSync(await client.get_latest(req.params.id), 'utf8'));
})

app.post('/update', upload.single(), async(req, res) => {
  console.log(req.body);
  let id = req.body.id;
  let value = req.body.value;
  let uid = req.body.uid;
  await client.update(id, value, { uid });
  res.send();
})

app.get('/', async(req, res, next) => {
  if(req.query.id) {
    next();
  } else {
    let { id } = await client.add('New File', Buffer.from(''));
    console.log(id)
    res.redirect(`/?id=${encodeURIComponent(id)}`)
  }
})

app.use(express.static('./app_static'));
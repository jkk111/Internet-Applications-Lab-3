let sql = require('sqlite3').verbose();
let db = new sql.Database('./db.sql');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS files(id INT, path TEXT)`)
  db.all("SELECT * FROM files", (err, rows) => {
    console.log(rows);
    if(rows.length === 0) {
      db.run("INSERT INTO files(id, path) VALUES(1, 'memes')")
    }
  })
})

let lookup = db.prepare("SELECT * FROM files WHERE path = ?")

module.exports = (router) => {
  router.on('lookup', (ws, m, callback) => {
    let filename = m.message;
    console.log('message: ', m, filename)
    lookup.all(filename, (err, result) => {
      if(err) console.log(err);
      if(result.length) {
        callback(result)
      }
    })
  });
}
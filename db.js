let sql = require('sqlite3').verbose();
let db = new sql.Database('./db.sql');

let lookup = db.prepare("SELECT * FROM files WHERE path = ?");
let insert = db.prepare("INSERT INTO files (id, path, hash) VALUES(?, ?, ?)");
let update_hash = db.prepare("UPDATE files SET hash = ? WHERE id = ?")

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS files(id TEXT, path TEXT, hash TEXT)`)
  db.all("SELECT * FROM files", (err, rows) => {
    console.log(rows);
    if(rows.length === 0) {
      db.run("INSERT INTO files(id, path, hash) VALUES(1, 'memes', '000001000001')")
    }
  })
})

let noop = () => {};

module.exports = () => {
  return {
    lookup: (path, cb) => {
      lookup.all(path, (err, result) => {
        if(err) console.log(err);
        if(result.length) {
          cb(result)
        } else {
          cb([]);
        }
      });
    },
    insert: (file_id, filename, hash, cb) => {
      insert.run(file_id, filename, hash, cb || noop);
    },
    update_hash: (hash, file_id, cb) => {
      update_hash.run(hash, file_id, cb || noop);
    }
  }
}
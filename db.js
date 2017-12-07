let sql = require('sqlite3').verbose();
let db = new sql.Database('./db.sql');

let lookup = db.prepare("SELECT * FROM files WHERE path = ?");
let lookup_id = db.prepare("SELECT * FROM files WHERE id = ?");
let insert = db.prepare("INSERT INTO files (id, path, hash) VALUES(?, ?, ?)");
let update_hash = db.prepare("UPDATE files SET hash = ? WHERE id = ?")

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS files(id TEXT, path TEXT, hash TEXT)`)
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
    lookup_id: (id, cb) => {
      lookup_id.all(id, (err, result) => {
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
    update: (hash, file_id, cb) => {
      update_hash.run(hash, file_id, cb || noop);
    },
    ls: (cb) => {
      db.all("SELECT * FROM files", (_, rows) => {
        cb(rows);
      })
    }
  }
}
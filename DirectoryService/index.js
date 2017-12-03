module.exports = (db, router) => {
  console.log(db)
  router.on('lookup', (ws, m, callback) => {
    let filename = m.message;
    console.log('message: ', m, filename)
    db.lookup(filename, (result) => {
      callback(result);
    });
  });

  router.on('add', (ws, m) => {
    let { file_id, filename, hash } = m;
    db.insert(file_id, filename, hash);
  });

  router.on('update', (ws, m) => {
    let { file_id, hash } = m;
    db.update_hash(hash, file_id)
  })
}
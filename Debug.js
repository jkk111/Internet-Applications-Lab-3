module.exports = (router) => {
  router.on('message', (ws, m) => {
    console.info('DEBUG: Message Received \'%s\' \'%s\'', ws.id, JSON.stringify(m))
  })
}
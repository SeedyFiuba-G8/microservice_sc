module.exports = function $statusController(serviceInfo, dbService, expressify) {
  return expressify({
    health,
    info,
    ping
  });

  async function health(req, res) {
    const dbStatus = await dbService.getDatabaseHealth();

    return res.status(200).json({
      database: dbStatus ? 'UP' : 'DOWN'
    });
  }

  function info(req, res) {
    return res.status(200).json(serviceInfo);
  }

  function ping(req, res) {
    return res.status(200).json({
      status: 'ok'
    });
  }
};

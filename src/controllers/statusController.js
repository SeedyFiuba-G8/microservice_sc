module.exports = function $statusController(dbService, expressify) {
  return expressify({
    health,
    ping
  });

  async function health(req, res) {
    const dbStatus = await dbService.getDatabaseHealth();

    const response = {
      database: dbStatus ? 'UP' : 'DOWN'
    };

    return res.status(200).json(response);
  }

  function ping(req, res) {
    const response = {
      status: 'ok'
    };

    return res.status(200).json(response);
  }
};

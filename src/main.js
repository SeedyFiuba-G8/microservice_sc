const containerFactory = require('./containerFactory');

function main() {
  containerFactory.createContainer().resolve(function start(app, config, logger) {
    const { port, host } = config.express;

    app.listen(port, host, () => {
      logger.info(`Listening on ${host}:${port}...`);
      logger.info(`Using network ${config.network}`);
      if (config.network === 'localhost') logger.warn(`You should have already run 'npx hardhat node'`);
    });
  });
}

if (require.main === module) {
  main();
}

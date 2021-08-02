module.exports = {
  logger: {
    format: 'local',
    console: {
      enabled: false
    },
    http: {
      enabled: false
    }
  },
  monitoring: false,
  services: {
    apikeys: {
      baseUrl: 'http://apikeys-test/'
    }
  }
};

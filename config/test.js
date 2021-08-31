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
      enabled: false,
      baseUrl: 'http://apikeys-test/'
    }
  }
};

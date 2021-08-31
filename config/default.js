const _ = require('lodash');
const ethers = require('ethers');
require('dotenv').config();

module.exports = {
  deployerMnemonic: _.get(process.env, 'MNEMONIC'),
  express: {
    host: '0.0.0.0',
    port: _.get(process.env, 'PORT', 3000)
  },
  fetch: {
    forwardHeaders: [],
    timeout: 300000 // ms
  },
  gasLimit: 200000,
  infuraApiKey: _.get(process.env, 'INFURA_API_KEY'),
  knex: {
    client: 'pg',
    connection: {
      connectionString: _.get(process.env, 'DATABASE_URL')
    }
  },
  logger: {
    console: {
      enabled: true,
      level: _.get(process.env, 'LOGGER_LEVEL', 'info'),
      prettyPrint: true
    },
    http: {
      enabled: true,
      level: _.get(process.env, 'LOGGER_LEVEL', 'info'),
      host: _.get(process.env, 'SUMOLOGIC_HOST'),
      path: _.get(process.env, 'SUMOLOGIC_PATH'),
      ssl: true
    }
  },
  monitoring: true,
  services: {
    apikeys: {
      enabled: true,
      header: 'x-api-key',
      baseUrl: 'https://sf-tdp2-apikeys-main.herokuapp.com/',
      key: {
        name: 'apikeys-validation-key',
        value: _.get(process.env, 'APIKEYS_KEY', 'SeedyFiubaSC')
      }
    }
  }
};

const _ = require('lodash');
const ethers = require('ethers');
require('dotenv').config();

module.exports = {
  deployerMnemonic: _.get(process.env, 'MNEMONIC'),
  express: {
    host: '0.0.0.0',
    port: _.get(process.env, 'PORT', 3000)
  },
  gasLimit: 200000,
  infuraApiKey: _.get(process.env, 'INFURA_API_KEY'),
  knex: {
    client: 'pg',
    connection: {
      connectionString: _.get(process.env, 'DATABASE_URL')
    }
  },
  log: {
    console: {
      enabled: true,
      level: 'info',
      timestamp: true,
      prettyPrint: true,
      json: false,
      colorize: true,
      stringify: false,
      label: 'microservice_sc'
    }
  },
  monitoring: true,
  services: {
    apikeys: {
      header: 'x-api-key',
      baseUrl: 'https://sf-tdp2-apikeys-main.herokuapp.com/',
      key: {
        name: 'apikeys-validation-key',
        value: _.get(process.env, 'APIKEYS_KEY', 'SeedyFiubaSC')
      }
    }
  }
};

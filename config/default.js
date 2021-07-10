const _ = require('lodash');
const ethers = require('ethers');
require('dotenv').config();

module.exports = {
  express: {
    host: '0.0.0.0',
    port: _.get(process.env, 'PORT', 3000)
  },
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
  deployerMnemonic: _.get(process.env, 'MNEMONIC'),
  infuraApiKey: _.get(process.env, 'INFURA_API_KEY')
};

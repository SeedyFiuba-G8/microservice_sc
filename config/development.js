const _ = require('lodash');
const ethers = require('ethers');

const PG_PASSWORD = _.get(process.env, 'PG_PASSWORD', 'postgres');
const DB_HOST = _.get(process.env, 'DB_HOST', 'localhost');
const DB_PORT = _.get(process.env, 'DB_PORT', '5432');
const DB_NAME = _.get(process.env, 'DB_NAME', 'sf_sc');

const network = 'localhost';
const deployArtifact = require(`../deployments/${network}/Seedifyuba`);

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

module.exports = {
  knex: {
    connection: {
      connectionString: _.get(
        process.env,
        'DATABASE_URL',
        `postgres://postgres:${PG_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
      )
    }
  },
  log: {
    console: {
      level: 'debug'
    }
  },
  contractAddress: deployArtifact.address,
  contractAbi: deployArtifact.abi,
  network,
  provider,
  monitoring: false
};

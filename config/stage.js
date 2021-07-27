const _ = require('lodash');
const ethers = require('ethers');

const network = 'kovan';
const deployArtifact = require(`../deployments/${network}/Seedifyuba`);

const provider = new ethers.providers.InfuraProvider(network, _.get(process.env, 'INFURA_API_KEY'));

module.exports = {
  contractAddress: deployArtifact.address,
  contractAbi: deployArtifact.abi,
  knex: {
    connection: {
      ssl: { rejectUnauthorized: false }
    }
  },
  network,
  provider,
  services: {
    apikeys: {
      baseUrl: 'https://sf-tdp2-apikeys-dev.herokuapp.com/'
    }
  }
};

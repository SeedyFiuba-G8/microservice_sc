const _ = require('lodash');
const ethers = require('ethers');

const network = 'kovan';
const deployArtifact = require(`../deployments/${network}/Seedifyuba`);

const provider = new ethers.providers.InfuraProvider(network, _.get(process.env, 'INFURA_API_KEY'));

module.exports = {
  knex: {
    connection: {
      ssl: { rejectUnauthorized: false }
    }
  },
  contractAddress: deployArtifact.address,
  contractAbi: deployArtifact.abi,
  network,
  provider
};

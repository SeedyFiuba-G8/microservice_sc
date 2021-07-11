const BigNumber = require('bignumber.js');
const ethers = require('ethers');

const projects = {};

module.exports = function $projectService(config, projectRepository) {
  return {
    create,
    get
  };

  function getContract(config, wallet) {
    return new ethers.Contract(config.contractAddress, config.contractAbi, wallet);
  }

  function toWei(number) {
    const WEIS_IN_ETHER = BigNumber(10).pow(18);
    return BigNumber(number).times(WEIS_IN_ETHER).toFixed();
  }

  /**
   * Creates a new project
   *
   * @returns {Promise} uuid
   */
  async function create(deployerWallet, stagesCost, projectOwnerAddress, projectReviewerAddress) {
    const seedyfiuba = await getContract(config, deployerWallet);
    const tx = await seedyfiuba.createProject(stagesCost.map(toWei), projectOwnerAddress, projectReviewerAddress);
    tx.wait(1).then((receipt) => {
      console.log('Transaction mined');
      const firstEvent = receipt && receipt.events && receipt.events[0];
      console.log(firstEvent);
      if (firstEvent && firstEvent.event == 'ProjectCreated') {
        const projectId = firstEvent.args.projectId.toNumber();
        console.log();
        projects[tx.hash] = {
          projectId,
          stagesCost,
          projectOwnerAddress,
          projectReviewerAddress
        };
      } else {
        // Throw?
        console.error(`Project not created in tx ${tx.hash}`);
      }
    });
    projectRepository.create({
      // tx.hash
      projectId,
      stagesCost,
      projectOwnerAddress,
      projectReviewerAddress
    })
    return tx;
  }

  async function get(id) {
    console.log(`Getting project ${id}: ${projects[id]}`);
    return projects[id];
  }
};

const BigNumber = require('bignumber.js');
const ethers = require('ethers');

module.exports = function $projectService(config, errors, logger, projectRepository) {
  return {
    create,
    fund,
    get,
    getAll
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
    let projectId;
    const seedyfiuba = await getContract(config, deployerWallet);
    const tx = await seedyfiuba.createProject(stagesCost.map(toWei), projectOwnerAddress, projectReviewerAddress);
    tx.wait(1)
      .then((receipt) => {
        logger.info('Transaction mined');
        const firstEvent = receipt && receipt.events && receipt.events[0];
        console.log('firstEvent: ', firstEvent);
        console.log('receipt: ', receipt);
        if (firstEvent && firstEvent.event == 'ProjectCreated') {
          projectId = firstEvent.args.projectId.toNumber();
          logger.info(`Project created in tx ${tx.hash}`);
        } else {
          logger.error(`Project not created in tx ${tx.hash}`);
          throw errors.UnknownError;
        }
      })
      .then(
        async () =>
          await projectRepository.create({
            hash: tx.hash,
            projectId,
            stagesCost,
            projectOwnerAddress,
            projectReviewerAddress
          })
      );
    return tx.hash;
  }

  async function fund(funderWallet, txHash, amount) {
    const projectId = (await get(txHash)).projectId;
    // Check project state === FUNDING. Check user has enough funds ?
    // console.log('funderWallet getBalance: ', String((await funderWallet.getBalance())));
    const seedyfiuba = await getContract(config, funderWallet);
    console.log('Before fund');
    const tx = await seedyfiuba.fund(projectId, { value: toWei(amount),  gasLimit: 100000});
    console.log('Before tx wait');
    tx.wait(1)
      .then((receipt) => {
        logger.info('Funding transaction mined');
        const events = receipt && receipt.events;
        console.log('Events: ', events);

        if (!events) {
          logger.error(`Project ${projectId} not funded in tx ${tx.hash}`);
          throw errors.UnknownError;
        }

        events.forEach((event) => {
          switch (event.event) {
            case 'ProjectFunded':
              console.log('event args: ', event.args);
              if (projectId !== event.args.projectId.toNumber()) {
                logger.error(
                  `Obtained projectId from transaction different: ${projectId} && ${event.args.projectId.toNumber()}`
                );
                throw errors.UnknownError;
              }

              logger.info(`Project funded in tx ${tx.hash}`);
              break;
            
            case 'ProjectStarted':
              if (projectId !== event.args.projectId.toNumber()) {
                logger.error(
                  `Obtained projectId from transaction different: ${projectId} && ${eventProjectId.toNumber()}`
                );
                throw errors.UnknownError;
              }
              logger.info(`Project funding completed. Project started in tx ${tx.hash}`);
              break;

            default:
              logger.error(`Unexpected event ${tx.hash}`);
              throw errors.UnknownError;
          }
        });
      })
      .then(async () => {
        const project = (await seedyfiuba.projects(projectId))
        console.log('Project: ', project, ' missingAmount: ', String(ethers.utils.fromWei(project.missingAmount)));
      });
    return tx.hash;
  }

  async function get(txHash) {
    logger.info(`Getting project with hash: ${txHash}`);
    const projectData = await projectRepository.get({
      filters: {
        txHash
      }
    });
    if (!projectData.length) throw errors.create(404, 'No project found with specified id.');
    return projectData[0];
  }

  async function getAll() {
    const projects = await projectRepository.get();
    logger.info(`Getting all projects: ${JSON.stringify(projects)}`);
    return projects;
  }
};

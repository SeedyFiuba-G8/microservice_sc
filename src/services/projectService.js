const BigNumber = require('bignumber.js');
const ethers = require('ethers');

const GAS_LIMIT = 100000;

module.exports = function $projectService(config, errors, logger, projectRepository) {
  return {
    create,
    fund,
    get,
    getAll,
    setCompletedStage
  };

  /**
   * Assert a project's status.
   */
  async function assertProjectStatus(currentStatus, status) {
    if (currentStatus !== status)
      throw errors.create(400, `Project not in ${status} status. (currently: ${currentStatus})`);
  }

  /**
   * Assert a project's Id.
   */
  function assertProjectId(project, otherId) {
    if (project !== otherId) {
      logger.error(`Obtained projectId from transaction different: ${projectId} && ${otherId}`);
      throw errors.UnknownError;
    }
  }

  /**
   * Assert a proj
   */
  async function assertProjectStage(currentStage, totalStages, completedStage) {
    if (currentStage > completedStage || completedStage > totalStages - 1)
      throw errors.create(400, 'Invalid completed stage value.');
  }

  /**
   * Assert a project's Reviewer address.
   */
  async function assertProjectReviewer(address, reviewerAdress) {
    if (address !== reviewerAdress) throw errors.create(400, 'Given reviewer adress is incorrect for project.');
  }

  /**
   * Assert a Wallet's balance.
   */
  async function assertWalletBalance(wallet, amount) {
    const balance = await wallet.getBalance();
    if (balance.lt(toWei(amount)))
      throw errors.create(400, `Insufficient funds. Funds available (${balance}) < funds requested (${toWei(amount)})`);
  }

  function getContract(config, wallet) {
    return new ethers.Contract(config.contractAddress, config.contractAbi, wallet);
  }

  function toWei(number) {
    const WEIS_IN_ETHER = BigNumber(10).pow(18);
    return BigNumber(number).times(WEIS_IN_ETHER).toFixed();
  }

  function fromWei(bigNumber) {
    const WEIS_IN_ETHER = BigNumber(10).pow(18);
    return bigNumber / WEIS_IN_ETHER;
  }

  /**
   * Generic action for acting con SeedifyUba Smart Contract.
   *
   * @returns {Promise}
   */
  async function action(contractCaller, transaction, handlers) {
    const seedifyuba = getContract(config, contractCaller);
    const tx = await transaction(seedifyuba);

    async function handleEvent(event, txHash) {
      if (!handlers[event.event]) {
        logger.error(`Unexpected event ${txHash}, event name: ${event.event}`);
        throw errors.UnknownError;
      }

      await handlers[event.event](event, txHash);
    }

    tx.wait(1)
      .then((receipt) => {
        logger.info('Transaction mined');
        if (!(receipt && receipt.events)) {
          logger.error('Transaction error');
          throw errors.UnknownError;
        }

        receipt.events.forEach(async (event) => {
          await handleEvent(event, tx.hash);
        });
      })
      .catch((err) => {
        logger.error('Unhandled exception during transaction');
        throw errors.UnknownError;
      });

    return tx.hash;
  }

  /**
   * Creates a new project
   *
   * @returns {Promise} uuid
   */
  async function create(deployerWallet, stagesCost, projectOwnerAddress, projectReviewerAddress) {
    const transaction = (seedyfiuba) => {
      return seedyfiuba.createProject(stagesCost.map(toWei), projectOwnerAddress, projectReviewerAddress);
    };

    const handlers = {
      ProjectCreated: async (event, txHash) => {
        projectId = event.args.projectId.toNumber();
        await projectRepository.create({
          hash: txHash,
          projectId,
          stagesCost,
          projectOwnerAddress,
          projectReviewerAddress
        });
      }
    };

    return action(deployerWallet, transaction, handlers);
  }

  async function fund(sponsorId, sponsorWallet, txHash, amount) {
    const project = await get(txHash);
    const projectId = project.projectId; // TMP

    async function validateFunding(wallet, projectId, amount) {
      await assertProjectStatus(project.currentStatus, projectRepository.status.FUNDING);
      await assertWalletBalance(sponsorWallet, amount);
    }

    await validateFunding(sponsorWallet, projectId, amount);

    const transaction = (seedyfiuba) => {
      return seedyfiuba.fund(projectId, { value: toWei(amount), gasLimit: GAS_LIMIT });
    };

    const handlers = {
      ProjectFunded: async (event, txHash) => {
        assertProjectId(projectId, event.args.projectId.toNumber());

        const received = fromWei(event.args.funds);

        await projectRepository.fund(projectId, sponsorId, received, txHash);
        logger.info(`Project funded in tx ${txHash}`);
      },
      ProjectStarted: async (event, txHash) => {
        assertProjectId(projectId, event.args.projectId.toNumber());

        await projectRepository.update(projectId, { currentStatus: projectRepository.status.IN_PROGRESS });
        logger.info(`Project funding completed. Project started in tx ${txHash}`);
      }
    };

    return action(sponsorWallet, transaction, handlers);
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

  async function _get(projectId) {
    logger.info(`Getting project with id: ${projectId}`);
    const projectData = await projectRepository.get({
      filters: {
        projectId
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

  async function setCompletedStage(txHash, reviewerWallet, completedStage) {
    const project = await get(txHash);
    const projectId = project.projectId; // TMP

    async function validateStageCompletion(project, reviewerWallet, completedStage) {
      await assertProjectStatus(project.currentStatus, projectRepository.status.IN_PROGRESS);
      await assertProjectStage(project.currentStage, project.totalStages, completedStage);
      await assertProjectReviewer(project.reviewerAddress, reviewerWallet.address);
    }

    await validateStageCompletion(project, reviewerWallet, completedStage);

    const transaction = (seedyfiuba) => {
      return seedyfiuba.setCompletedStage(projectId, completedStage, { gasLimit: GAS_LIMIT });
    };

    const handlers = {
      StageCompleted: async (event) => {
        logger.info('Stage completed!');
        const projectId = event.args.projectId.toNumber();
        const completedStage = event.args.stageCompleted.toNumber();

        projectRepository.update(projectId, { currentStage: completedStage + 1 });
      },
      ProjectCompleted: async (event) => {
        logger.info('Project completed!');
        const projectId = event.args.projectId.toNumber();

        projectRepository.update(projectId, { currentStatus: projectRepository.status.COMPLETED });
      }
    };

    return action(reviewerWallet, transaction, handlers);
  }
};

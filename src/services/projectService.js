const ethers = require('ethers');

module.exports = function $projectService(config, conversionUtils, errors, logger, projectRepository) {
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
      throw errors.create(400, `Project not in ${status} status. (current: ${currentStatus})`);
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
   * Assert a project's stage
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
    if (balance.lt(conversionUtils.toWei(amount)))
      throw errors.create(
        400,
        `Insufficient funds. Funds available (${balance}) < funds requested (${conversionUtils.toWei(amount)})`
      );
  }

  function getContract(config, wallet) {
    return new ethers.Contract(config.contractAddress, config.contractAbi, wallet);
  }

  /**
   * Creates a new project
   *
   * @returns {Promise} uuid
   */
  async function create(deployerWallet, stagesCost, projectOwnerAddress, projectReviewerAddress) {
    let projectId;
    const seedyfiuba = await getContract(config, deployerWallet);
    const tx = await seedyfiuba.createProject(
      stagesCost.map(conversionUtils.toWei),
      projectOwnerAddress,
      projectReviewerAddress
    );
    tx.wait(1)
      .then((receipt) => {
        logger.info('CreateProject transaction mined');
        const firstEvent = receipt && receipt.events && receipt.events[0];
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

  async function fund(sponsorId, sponsorWallet, txHash, amount) {
    const projectId = (await get(txHash)).projectId; // TMP

    async function validateFunding(wallet, projectId, amount) {
      const project = await _get(projectId);
      await assertProjectStatus(project.currentStatus, projectRepository.status.FUNDING);
      await assertWalletBalance(sponsorWallet, amount);
    }

    async function handleEvent(event, txHash) {
      const handlersMap = {
        ProjectFunded: async (event, txHash) => {
          assertProjectId(projectId, event.args.projectId.toNumber());

          const received = conversionUtils.fromWei(event.args.funds);

          await projectRepository.fund(projectId, sponsorId, received, txHash);
          logger.info(`Project funded in tx ${txHash}`);
        },
        ProjectStarted: async (event, txHash) => {
          assertProjectId(projectId, event.args.projectId.toNumber());

          await projectRepository.update(projectId, { currentStatus: projectRepository.status.IN_PROGRESS });
          logger.info(`Project funding completed. Project started in tx ${txHash}`);
        }
      };

      if (!handlersMap[event.event]) {
        logger.error(`Unexpected event ${txHash}, event name: ${event.event}`);
        throw errors.UnknownError;
      }
      await handlersMap[event.event](event, txHash);
    }

    await validateFunding(sponsorWallet, projectId, amount);

    const seedyfiuba = await getContract(config, sponsorWallet);
    const tx = await seedyfiuba.fund(projectId, { value: conversionUtils.toWei(amount), gasLimit: config.gasLimit });
    tx.wait(1).then(async (receipt) => {
      logger.info('Funding transaction mined');
      if (!(receipt && receipt.events)) {
        logger.error(`Project ${projectId} not funded in tx ${tx.hash}`);
        throw errors.UnknownError;
      }

      receipt.events.forEach(async (event) => {
        await handleEvent(event, tx.hash);
      });
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
    const projectId = (await get(txHash)).projectId; // TMP

    async function validateStageCompletion(projectId, reviewerWallet, completedStage) {
      const project = await _get(projectId);
      await assertProjectStatus(project.currentStatus, projectRepository.status.IN_PROGRESS);
      await assertProjectStage(project.currentStage, project.totalStages, completedStage);
      await assertProjectReviewer(project.reviewerAddress, reviewerWallet.address);
    }

    async function handleEvent(event, projectId) {
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

      handlers[event.event](event, projectId);
    }

    await validateStageCompletion(projectId, reviewerWallet, completedStage);

    const seedyfiuba = await getContract(config, reviewerWallet);
    const tx = await seedyfiuba.setCompletedStage(projectId, completedStage, { gasLimit: config.gasLimit });
    tx.wait(1).then((receipt) => {
      logger.info('SetCompletedStage transaction mined.');
      if (!(receipt && receipt.events)) {
        logger.error(`Project ${projectId} didn't complete stage in tx ${tx.hash}`);
        throw errors.UnknownError;
      }

      receipt.events.forEach(async (event) => {
        await handleEvent(event, projectId);
      });
    });
    return tx.hash;
  }
};

const ethers = require('ethers');

module.exports = function $projectService(
  config,
  conversionUtils,
  errors,
  logger,
  notificationService,
  projectRepository,
  walletRepository
) {
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
    let tx;
    const seedyfiuba = await getContract(config, deployerWallet);

    async function sendErrorNotifications(projectOwnerAddress, projectReviewerAddress) {
      await notificationService.pushNotification(
        await walletRepository.getWalletId(projectOwnerAddress),
        'Project could not be published :(',
        'Your project could not be published. It will remain draft. Tap for more info.',
        { type: 'entrepeneurProjectNotPublished' }
      );

      await notificationService.pushNotification(
        await walletRepository.getWalletId(projectReviewerAddress),
        'Project could not be published :(',
        'A project you review could not be published. It will remain draft. Tap for more info.',
        { type: 'reviewerProjectNotPublished' }
      );
    }

    async function sendProjectCreatedNotifications(projectOwnerAddress, projectReviewerAddress) {
      await notificationService.pushNotification(
        await walletRepository.getWalletId(projectOwnerAddress),
        'Project published!',
        'Your project was successfully published. Tap for more info.',
        { type: 'entrepeneurProjectPublished' }
      );

      await notificationService.pushNotification(
        await walletRepository.getWalletId(projectReviewerAddress),
        'Project published!',
        'A project you review was successfully published. Tap for more info.',
        { type: 'reviewerProjectPublished' }
      );
    }
    try {
      tx = await seedyfiuba.createProject(
        stagesCost.map(conversionUtils.toWei),
        projectOwnerAddress,
        projectReviewerAddress
      );

      tx.wait(1)
        .then(async (receipt) => {
          logger.info('CreateProject transaction mined');

          const firstEvent = receipt && receipt.events && receipt.events[0];
          if (firstEvent && firstEvent.event == 'ProjectCreated') {
            projectId = firstEvent.args.projectId.toNumber();
            logger.info(`Project created in tx ${tx.hash}`);
            sendProjectCreatedNotifications(projectOwnerAddress, projectReviewerAddress);
          } else {
            logger.error(`Project not created in tx ${tx.hash}`);
            sendErrorNotifications(projectOwnerAddress, projectReviewerAddress);
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
    } catch (err) {
      sendErrorNotifications(projectOwnerAddress, projectReviewerAddress);
      logger.error(err.message);
      throw errors.create(
        400,
        `App's wallet was not able to initialize transaction. Contact an administrator. Details: ${err.message}`
      );
    }
    return tx.hash;
  }

  async function fund(sponsorId, sponsorWallet, txHash, amount) {
    let tx;
    const projectId = (await get(txHash)).projectId;

    async function validateFunding(wallet, projectId, amount) {
      const project = await _get(projectId);
      await assertProjectStatus(project.currentStatus, projectRepository.status.FUNDING);
      await assertWalletBalance(wallet, amount);
    }

    async function sendErrorNotifications(sponsorId) {
      await notificationService.pushNotification(
        sponsorId,
        `Your funds could not be transferred :(`,
        `Make sure you have necessary funds in your wallet to cost the tx.`,
        { type: 'funderProjectNotFunded' }
      );
    }

    async function sendProjectFundedNotifications(projectId, sponsorId, received) {
      await notificationService.pushNotification(
        await walletRepository.getWalletId((await _get(projectId)).ownerAddress),
        'Your project was funded!',
        `Your project received ${received} ETHs. Tap for more info.`,
        { type: 'entrepeneurProjectFunded' }
      );

      await notificationService.pushNotification(
        sponsorId,
        `${received} ETHs successfully transferred!`,
        `You successfully transferred ${received} ETHs to the project. Tap for more info.`,
        { type: 'funderProjectFunded' }
      );
    }

    async function sendProjectStartedNotifications(projectId) {
      const { ownerAddress, reviewerAddress } = await _get(projectId);

      await notificationService.pushNotification(
        await walletRepository.getWalletId(ownerAddress),
        'Your project has started!',
        `Your project is totally funded and is now in progress. Tap for more info.`,
        { type: 'entrepeneurProjectStarted' }
      );

      await notificationService.pushNotification(
        await walletRepository.getWalletId(reviewerAddress),
        'A project you review has started!',
        `A project you review is totally funded and is now in progress. Tap for more info.`,
        { type: 'reviewerProjectStarted' }
      );
    }

    async function handleEvent(event, txHash) {
      const handlersMap = {
        ProjectFunded: async (event, txHash) => {
          assertProjectId(projectId, event.args.projectId.toNumber());

          const received = conversionUtils.fromWei(event.args.funds);

          await projectRepository.fund(projectId, sponsorId, received, txHash);

          logger.info(`Project funded in tx ${txHash}`);
          sendProjectFundedNotifications(projectId, sponsorId, received);
        },
        ProjectStarted: async (event, txHash) => {
          assertProjectId(projectId, event.args.projectId.toNumber());

          await projectRepository.update(projectId, { currentStatus: projectRepository.status.IN_PROGRESS });

          logger.info(`Project funding completed. Project started in tx ${txHash}`);
          sendProjectStartedNotifications(projectId);
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

    try {
      tx = await seedyfiuba.fund(projectId, { value: conversionUtils.toWei(amount), gasLimit: config.gasLimit });

      tx.wait(1).then(async (receipt) => {
        logger.info('Funding transaction mined');

        if (!(receipt && receipt.events)) {
          logger.error(`Project ${projectId} not funded in tx ${tx.hash}`);
          sendErrorNotifications(sponsorId);
          throw errors.UnknownError;
        }

        receipt.events.forEach(async (event) => {
          await handleEvent(event, tx.hash);
        });
      });
    } catch (err) {
      sendErrorNotifications(sponsorId);
      logger.error(err.message);
      throw errors.create(
        400,
        `You were not able to initialize transaction. Check your wallet funds. Details: ${err.message}`
      );
    }

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
    let tx;
    const projectId = (await get(txHash)).projectId;

    async function validateStageCompletion(projectId, reviewerWallet, completedStage) {
      const project = await _get(projectId);
      await assertProjectStatus(project.currentStatus, projectRepository.status.IN_PROGRESS);
      await assertProjectStage(project.currentStage, project.totalStages, completedStage);
      await assertProjectReviewer(project.reviewerAddress, reviewerWallet.address);
    }

    async function sendErrorNotifications(projectId) {
      logger.error(`Project ${projectId} didn't complete stage`);

      const { reviewerAddress } = await _get(projectId);

      await notificationService.pushNotification(
        await walletRepository.getWalletId(reviewerAddress),
        `Stage ${completedStage} could not be set as completed :(`,
        `Make sure you have necessary funds in your wallet to cost the tx.`,
        { type: 'reviewerProjectStageNotCompleted' }
      );
    }

    async function sendStageCompletedNotifications(projectId) {
      const { ownerAddress, reviewerAddress } = await _get(projectId);

      await notificationService.pushNotification(
        await walletRepository.getWalletId(ownerAddress),
        `Your project has completed stage ${completedStage}!`,
        `Funds for next stage are available in your wallet. Tap for more info.`,
        { type: 'entrepeneurProjectStageCompleted' }
      );

      await notificationService.pushNotification(
        await walletRepository.getWalletId(reviewerAddress),
        `Stage ${completedStage} set as completed successfully!`,
        `Funds for next stage released to entrepeneur. Tap for more info.`,
        { type: 'reviewerProjectStageCompleted' }
      );
    }

    async function sendProjectCompletedNotifications(projectId) {
      const { ownerAddress, reviewerAddress } = await _get(projectId);

      await notificationService.pushNotification(
        await walletRepository.getWalletId(ownerAddress),
        `Your project is done!`,
        `Tap for more info.`,
        { type: 'entrepeneurProjectCompleted' }
      );

      await notificationService.pushNotification(
        await walletRepository.getWalletId(reviewerAddress),
        `A project you review is done!`,
        `Tap for more info.`,
        { type: 'reviewerProjectCompleted' }
      );
    }

    async function handleEvent(event, projectId) {
      const handlers = {
        StageCompleted: async (event) => {
          const projectId = event.args.projectId.toNumber();
          const completedStage = event.args.stageCompleted.toNumber();

          logger.info(`Stage ${completedStage} of project ${projectId} completed!`);

          projectRepository.update(projectId, { currentStage: completedStage + 1 });
          sendStageCompletedNotifications(projectId);
        },
        ProjectCompleted: async (event) => {
          const projectId = event.args.projectId.toNumber();

          logger.info(`Project ${projectId} completed!`);

          projectRepository.update(projectId, { currentStatus: projectRepository.status.COMPLETED });
          sendProjectCompletedNotifications(projectId);
        }
      };

      handlers[event.event](event, projectId);
    }

    await validateStageCompletion(projectId, reviewerWallet, completedStage);

    const seedyfiuba = await getContract(config, reviewerWallet);

    try {
      tx = await seedyfiuba.setCompletedStage(projectId, completedStage, { gasLimit: config.gasLimit });

      tx.wait(1).then(async (receipt) => {
        logger.info('SetCompletedStage transaction mined.');

        if (!(receipt && receipt.events)) {
          sendErrorNotifications(projectId);
          throw errors.UnknownError;
        }

        receipt.events.forEach(async (event) => {
          await handleEvent(event, projectId);
        });
      });
    } catch (err) {
      sendErrorNotifications(projectId);
      logger.error(err.message);
      throw errors.create(
        400,
        `You were not able to initialize transaction. Check your wallet funds. Details: ${err.message}`
      );
    }

    return tx.hash;
  }
};

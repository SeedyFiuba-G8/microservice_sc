module.exports = function $projectController(expressify, projectService, walletService) {
  return expressify({
    create,
    fund,
    get,
    getAll,
    patch
  });

  /**
   * Creates a new project and returns the tx hash associated.
   *
   * @returns {Promise}
   */
  async function create(req, res) {
    const { ownerId, reviewerId, stagesCost } = req.body;
    const tx = await projectService.create(
      walletService.getDeployerWallet(),
      stagesCost,
      (await walletService.getWalletData(ownerId)).address,
      (await walletService.getWalletData(reviewerId)).address
    );
    return res.status(200).json(tx);
  }

  /**
   * Funds a new project and returns the funding tx hash associated.
   *
   * @returns {Promise}
   */
  async function fund(req, res) {
    const { walletId, amount } = req.body;
    const { projectId } = req.params;
    const tx = await projectService.fund(walletId, await walletService.getWallet(walletId), projectId, amount);
    return res.status(200).json(tx);
  }

  /**
   * Gets the information of an existing project by its id
   *
   * @returns {Promise}
   */
  async function get(req, res) {
    const { projectId } = req.params;
    const projectInfo = await projectService.get(projectId);
    return res.status(200).json(projectInfo);
  }

  /**
   * Gets all projects
   *
   * @returns
   */
  async function getAll(req, res) {
    const projectsList = await projectService.getAll();
    return res.status(200).json(projectsList);
  }

  /**
   * Advance the stage of a project
   *
   * @returns {Promise}
   */
  async function patch(req, res) {
    const { projectId } = req.params;
    const { completedStage, reviewerId } = req.body;
    const tx = await projectService.setCompletedStage(
      projectId,
      await walletService.getWallet(reviewerId),
      completedStage
    );
    return res.status(200).json(tx);
  }
};

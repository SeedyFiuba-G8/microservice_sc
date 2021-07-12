module.exports = function $projectController(expressify, projectService, walletService) {
  return expressify({
    create,
    fund,
    get,
    getAll
  });

  /**
   * Creates a new project and returns the transaction associated.
   *
   * @returns {Promise}
   */
  async function create(req, res) {
    const tx = await projectService.create(
      walletService.getDeployerWallet(),
      req.body.stagesCost,
      (await walletService.getWalletData(req.body.ownerId)).address,
      (await walletService.getWalletData(req.body.reviewerId)).address
    );
    return res.status(200).json(tx);
  }

  /**
   * Funds a new project and returns ?.
   *
   * @returns {Promise}
   */
  async function fund(req, res) {}

  /**
   * Gets the information of an existing project by its id
   *
   * @returns {Promise}
   */
  async function get(req, res) {
    const projectInfo = await projectService.get(req.params.projectId);
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
};

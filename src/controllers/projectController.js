module.exports = function $projectController(expressify, projectService, walletService) {
  return expressify({
    create,
    get
  });

  /**
   * Creates a new project and returns the transaction associated.
   *
   * @returns {Promise}
   */
  async function create(req, res) {
    console.log('[LOG] entering projectController create');
    const tx = await projectService.create(
      walletService.getDeployerWallet(),
      req.body.stagesCost,
      walletService.getWalletData(req.body.ownerId).address,
      walletService.getWalletData(req.body.reviewerId).address
    );
    console.log('[LOG] projectService returned tx: ', tx);
    return res.status(200).json(tx);
  }

  /**
   * Gets the information of an existing project by its id
   *
   * @returns {Promise}
   */
  async function get(req, res) {
    const projectInfo = await projectService.getProject(req.params.projectId);
    return res.status(200).json(projectInfo);
  }
};

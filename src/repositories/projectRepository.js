const _ = require('lodash');

const STATUS = {
  FUNDING: 'FUNDING',
  CANCELED: 'CANCELED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

module.exports = function $projectRepository(dbUtils, errors, knex, logger) {
  return {
    create,
    get,
    setStatus,
    fund,
    assertProjectStatus,
    status: STATUS
  };

  /**
   * Inserts a new project and stages costs to db
   *
   * @returns {String}
   */
  async function create(projectData) {
    await knex('projects')
      .insert(
        dbUtils.mapToDb({
          txHash: projectData.hash,
          projectId: projectData.projectId,
          ownerAddress: projectData.projectOwnerAddress,
          reviewerAddress: projectData.projectReviewerAddress,
          totalStages: projectData.stagesCost.length
        })
      )
      .catch((err) => {
        if (err.code === '23505') throw errors.create(409, 'Project already exists.');
        // TODO: HANDLE ERRORS

        logger.error(err);
        throw errors.UnknownError;
      });
    stagesList = projectData.stagesCost.map((cost, i) => {
      const stageCost = {
        projectId: projectData.projectId,
        stage: i,
        cost
      };
      return stageCost;
    });

    await knex('stages_cost')
      .insert(dbUtils.mapToDb(stagesList))
      .catch((err) => {
        // TODO: HANDLE ERRORS

        logger.error(err);
        throw errors.UnknownError;
      });
    return projectData.projectId;
  }

  /**
   * Generic get abstraction
   *
   * @returns {Promise}
   */
  async function get({ select, filters = {}, limit, offset } = {}) {
    const projectQuery = knex('projects')
      .select(_.isArray(select) ? dbUtils.mapToDb(select) : '*')
      .where(dbUtils.mapToDb(filters))
      .orderBy('project_id', 'desc');

    if (limit) projectQuery.limit(limit);
    if (offset) projectQuery.offset(offset);

    const projects = await projectQuery.then(dbUtils.mapFromDb);
    const ids = projects.map((project) => project.projectId);
    const stagesQuery = knex('stages_cost').whereIn('project_id', ids).orderBy('stage', 'asc');
    const stages = await stagesQuery.then(dbUtils.mapFromDb);

    const fundsQuery = knex('records').whereIn('project_id', ids);
    const funds = await fundsQuery.then(dbUtils.mapFromDb);

    projects.forEach((project) => {
      // Add stages cost
      project.stagesCost = stages
        .filter((stage) => stage.projectId === project.projectId)
        .map((stage) => {
          return Number(stage.cost);
        });

      // Add total funds
      project.totalFunded = _.sumBy(
        funds.filter((fund) => project.projectId === fund.projectId),
        (fund) => Number(fund.amount)
      );
      return project;
    });

    return projects;
  }

  /**
   * Assert a project's status.
   *
   */
  async function assertProjectStatus(projectId, status) {
    const project = (await get({ filters: { projectId } }))[0];
    if (project.currentStatus !== status)
      throw errors.create(400, `Project not in ${status} status. (current: ${project.currentStatus})`);
  }

  /**
   * Set a project as Started.
   *
   * @returns {Promise}
   */
  async function setStatus(projectId, status) {
    logger.info(`Setting project as ${status}: ${projectId}`);

    console.log();

    return await knex('projects')
      .update('current_status', status)
      .where(dbUtils.mapToDb({ projectId }))
      .then(dbUtils.mapFromDb);
  }

  /**
   * Set record for funding of a project.
   *
   * @returns {Promise}
   */
  async function fund(projectId, walletId, amount, txHash) {
    await assertProjectStatus(projectId, STATUS.FUNDING);

    logger.info(`Funding project: ${projectId} by: ${walletId} with amount: ${amount}`);

    return await knex('records')
      .insert(dbUtils.mapToDb({ walletId, projectId, amount, txHash }))
      .catch((err) => {
        // TODO: handle errors.
        logger.error(err);
        throw errors.UnknownError;
      });
  }
};

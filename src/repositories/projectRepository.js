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
    update,
    fund,
    getFundings,
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

      const projectFunds = funds.filter((fund) => project.projectId === fund.projectId);

      // Add total funds
      project.totalFunded = _.sumBy(projectFunds, (fund) => Number(fund.amount));

      // Add contributors and contributions
      project.contributions = projectFunds.length;

      const distinctContributors = new Set();
      projectFunds.forEach((fund) => distinctContributors.add(fund.walletId));
      project.contributors = distinctContributors.size;

      return project;
    });

    return projects;
  }

  async function getFundings({ select, filters = {}, limit, offset } = {}) {
    const fundingsQuery = knex('records')
      .select(_.isArray(select) ? dbUtils.mapToDb(select) : '*')
      .where(dbUtils.mapToDb(filters))
      .orderBy('date', 'desc');

    if (limit) fundingsQuery.limit(limit);
    if (offset) fundingsQuery.offset(offset);

    const fundings = (await fundingsQuery.then(dbUtils.mapFromDb)).map(async (funding) => ({
      ...funding,
      date: funding.date.toISOString(),
      projectId: await getProjectTxHash(funding.projectId),
      amount: Number(funding.amount)
    }));

    return Promise.all(fundings);
  }

  /**
   * Set a project as Started.
   *
   * @returns {Promise}
   */
  async function update(projectId, updateFields) {
    logger.debug(`Updating fields: ${JSON.stringify(updateFields)} of: ${projectId}`);

    return await knex('projects')
      .update(dbUtils.mapToDb(updateFields))
      .where(dbUtils.mapToDb({ projectId }))
      .catch((err) => {
        logger.error(err);
        throw errors.UnknownError;
      });
  }

  /**
   * Set record for funding of a project.
   *
   * @returns {Promise}
   */
  async function fund(projectId, walletId, amount, txHash) {
    logger.info(`Funding project: ${projectId} by: ${walletId} with amount: ${amount}`);

    return await knex('records')
      .insert(dbUtils.mapToDb({ walletId, projectId, amount, txHash }))
      .catch((err) => {
        logger.error(err);
        throw errors.UnknownError;
      });
  }

  async function getProjectTxHash(projectId) {
    const project = await knex('projects').where(dbUtils.mapToDb({ projectId })).then(dbUtils.mapFromDb);
    if (!project.length) throw errors.create(404, `Project with id: ${projectId} not found in sc database.`);
    return project[0].txHash;
  }
};

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
   * Set a project as Started.
   *
   * @returns {Promise}
   */
  async function update(projectId, updateFields) {
    logger.debug(`Updating fields: ${JSON.stringify(updateFields)} of: ${projectId}`);

    const update_fields = dbUtils.mapToDb(updateFields);
    console.log(update_fields);

    const project_id = dbUtils.mapToDb({ projectId: String(projectId) });
    console.log(project_id);

    return knex('projects')
      .update(update_fields)
      .where(project_id)
      .then((response) => {
        console.log(response);
        return dbUtils.mapFromDb(response);
      })
      .catch((err) => {
        // TODO: handle errors.
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
        // TODO: handle errors.
        logger.error(err);
        throw errors.UnknownError;
      });
  }
};

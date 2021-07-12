const _ = require('lodash');

module.exports = function $projectRepository(dbUtils, errors, knex, logger) {
  return {
    create,
    get
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
    console.log(`Stages: ${JSON.stringify(stagesList)}`);
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

    projects.forEach((project) => {
      project.stagesCost = stages
        .filter((stage) => stage.projectId === project.projectId)
        .map((stage) => {
          return Number(stage.cost);
        });
      return project;
    });

    return projects;
  }
};

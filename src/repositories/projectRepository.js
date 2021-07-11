const _ = require('lodash');

/*
 * For convenience, we use the core microservice userId as the walletId,
 * in order to keep up with the restriction of 1 user <--> 1 wallet,
 * and to avoid an unnecessary mapping.
 */

module.exports = function $projectRepository(dbUtils, errors, knex, logger) {
  return {
    create,
    get,
    remove
  };

  /**
   * Inserts a new project and stages costs to db
   *
   * @returns {Promise}
   */
  async function create(projectData) {
    var a = knex('projects')
      .insert(dbUtils.mapToDb({
        projectId: projectData.projectId,
        ownerAddress: projectData.projectOwnerAddress,
        reviewerAddress: projectData.projectReviewerAddress,
        totalStages: projectData.stagesCost.length
      }))
      .catch((err) => {
        if (err.code === '23505') throw errors.create(409, 'Project already exists.')
        // TODO: HANDLE ERRORS

        logger.error(err);
        throw errors.Conflict;
      });
    projectData.stagesCost.forEach(cost, i => {
      const stageCost = {
        prjectId: projectData.projectId,
        stage: i,
        cost: cost,
      }
      var b = knex('stages_cost')
        .insert(dbUtils.mapToDb(stageCost))
        .catch((err) => {
          // TODO: HANDLE ERRORS
  
          logger.error(err);
          throw errors.Conflict;
        });
    });
  }

  /**
   * Generic get abstraction
   *
   * @returns {Promise}
   */
  async function get({ select, filters = {}, limit, offset } = {}) {
    const project_query = knex('projects')
      .select(_.isArray(select) ? dbUtils.mapToDb(select) : '*')
      .where(dbUtils.mapToDb(filters))
      .orderBy('project_id', 'desc');

    if (limit) project_query.limit(limit);
    if (offset) project_query.offset(offset);

    projectData = project_query.then(dbUtils.mapFromDb);
    
    // HMMM no
    // projectData.stagesCost = knex('projects')
    //   .select(_.isArray(select) ? dbUtils.mapToDb(select) : '*')
    //   .where(dbUtils.mapToDb({projectId: projectData.projectId}))
    //   .orderBy('project_id', 'desc')
    //   .then(dbUtils.mapFromDb);

    return ;
  }
};

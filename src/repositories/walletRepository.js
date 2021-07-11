const _ = require('lodash');

/*
 * For convenience, we use the core microservice userId as the walletId,
 * in order to keep up with the restriction of 1 user <--> 1 wallet,
 * and to avoid an unnecessary mapping.
 */

module.exports = function $walletRepository(dbUtils, errors, knex, logger) {
  return {
    create,
    get,
    remove
  };

  /**
   * Inserts a new wallet to the db
   *
   * @returns {Promise}
   */
  async function create(walletData) {
    return knex('wallets')
      .insert(dbUtils.mapToDb(walletData))
      .catch((err) => {
        if (err.code === '23505') throw errors.create(409, 'The user has an existing wallet.');

        logger.error(err);
        throw errors.Conflict;
      });
  }

  /**
   * Generic get abstraction
   *
   * @returns {Promise}
   */
  async function get({ select, filters = {}, limit, offset } = {}) {
    const query = knex('wallets')
      .select(_.isArray(select) ? dbUtils.mapToDb(select) : '*')
      .where(dbUtils.mapToDb(filters))
      .orderBy('wallet_id', 'desc');

    if (limit) query.limit(limit);
    if (offset) query.offset(offset);

    return query.then(dbUtils.mapFromDb);
  }

  /**
   * Removes a wallet with specified id
   *
   * @returns {Promise}
   */
  async function remove(walletId) {
    const result = await knex('wallets').where(dbUtils.mapToDb({ walletId })).del();

    if (!result) {
      throw errors.create(404, 'There is no wallet with the specified id.');
    }
  }
};
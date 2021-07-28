module.exports = function $notificationRepository(dbUtils, errors, knex, logger) {
  return {
    get,
    push,
    remove
  };

  function push(walletId, token) {
    return knex('notification_tokens')
      .insert(dbUtils.mapToDb({ walletId, token }))
      .catch((err) => {
        if (err.code === '23505') {
          // Row already exists. We do nothing.
          return;
        }
        logger.error(err);
        throw errors.UnknownError;
      });
  }

  function get(walletId) {
    return knex('notification_tokens')
      .where(dbUtils.mapToDb({ walletId }))
      .select('token')
      .then(dbUtils.mapFromDb)
      .then((tokens) => tokens.map((token) => token.token));
  }

  function remove(walletId, token) {
    return knex('notification_tokens').where(dbUtils.mapToDb({ walletId, token })).del();
  }
};

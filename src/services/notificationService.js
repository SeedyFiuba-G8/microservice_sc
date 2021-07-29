const { Expo } = require('expo-server-sdk');

module.exports = function $notificationService(errors, logger, notificationRepository, sendNotifications) {
  return {
    pushNotification,
    pushToken,
    removeToken
  };

  /**
   *
   * @param {String} walletId
   * @param {String} token
   * @returns {Promise}
   */
  async function pushToken(walletId, token) {
    if (!Expo.isExpoPushToken(token)) throw errors.create(400, `Push token ${token} is not a valid Expo push token`);
    logger.info(`Adding ExpoToken for wallet ${walletId}`);
    await notificationRepository.push(walletId, token);
  }

  /**
   * Remove a user's expo push token
   *
   * @param {String} userId
   * @param {String} token
   * @returns {Promise}
   */
  async function removeToken(walletId, token) {
    logger.info(`Removing ExpoToken for wallet ${walletId}`);

    return notificationRepository.remove(walletId, token);
  }

  async function pushNotification(walletId, title, body, data) {
    if (!walletId) return;
    const toUserTokens = await notificationRepository.get(walletId);
    const notifications = [];

    logger.info(`Sending notification: '${title}' '${body}' to wallet id ${walletId}`);

    toUserTokens.forEach((token) =>
      notifications.push({
        to: token,
        sound: 'default',
        title,
        body,
        data
      })
    );

    return sendNotifications(notifications);
  }
};

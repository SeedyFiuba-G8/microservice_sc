module.exports = function $notificationController(expressify, notificationService) {
  return expressify({
    pushToken,
    removeToken
  });

  async function pushToken(req, res) {
    const { walletId } = req.params;
    const { token } = req.body;
    await notificationService.pushToken(walletId, token);
    return res.status(200).json(walletId);
  }

  async function removeToken(req, res) {
    const { walletId } = req.params;
    const expoToken = req.headers['expo-token'];
    await notificationService.removeToken(walletId, expoToken);
    return res.status(200).json();
  }
};

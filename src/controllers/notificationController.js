module.exports = function $notificationController(expressify, notificationService) {
  return expressify({
    pushToken
  });

  async function pushToken(req, res) {
    const { walletId } = req.params;
    const { token } = req.body;
    await notificationService.pushToken(walletId, token);
    return res.status(200).json(walletId);
  }
};

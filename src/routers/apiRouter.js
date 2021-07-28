const express = require('express');

module.exports = function apiRouter(
  apiValidatorMiddleware,
  notificationController,
  projectController,
  statusController,
  walletController,
  validateApikeyMiddleware
) {
  return (
    express
      .Router()
      // Redirect root to api docs
      .get('/', (req, res) => res.redirect('/api-docs'))

      // OpenAPI Validator Middleware
      .use(apiValidatorMiddleware)
      .use(validateApikeyMiddleware)

      // STATUS
      .get('/ping', statusController.ping)
      .get('/health', statusController.health)
      .get('/info', statusController.info)

      // ROUTES

      // Projects
      .get('/projects', projectController.getAll)
      .post('/projects', projectController.create)
      .get('/projects/:projectId', projectController.get)
      .patch('/projects/:projectId', projectController.patch)
      .post('/projects/:projectId/funds', projectController.fund)

      // Wallets
      .post('/wallets/:walletAddress/funds', walletController.transfer)
      .get('/wallets/:walletId/fundings', walletController.getFundings)
      .get('/wallets/fundings', walletController.getAllFundings)
      .post('/wallets', walletController.create)
      .get('/wallets', walletController.getAll)
      .get('/wallets/:walletId', walletController.get)

      // Notifications
      .post('/wallets/:walletId/pushToken', notificationController.pushToken)
      .delete('/wallets/:walletId/pushToken', notificationController.removeToken)
  );
};

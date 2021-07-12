const express = require('express');

module.exports = function apiRouter(apiValidatorMiddleware, projectController, statusController, walletController) {
  return (
    express
      .Router()
      // Redirect root to api docs
      .get('/', (req, res) => res.redirect('/api-docs'))

      // OpenAPI Validator Middleware
      .use(apiValidatorMiddleware)

      // PROJECTS
      .get('/projects', projectController.getAll)
      .post('/projects', projectController.create)
      .get('/projects/:projectId', projectController.get)
      .patch('/projects/:projectId', projectController.patch)
      .post('/projects/:projectId/funds', projectController.funds)

      // WALLETS
      .post('/wallets', walletController.create)
      .get('/wallets', walletController.getAll)
      .get('/wallets/:walletId', walletController.get)

      // STATUS
      .get('/ping', statusController.ping)
      .get('/health', statusController.health)

    // ROUTES

    // Projects
    // .get('/projects', projectController.getBy)
    // .post('/projects', projectController.create)
    // .get('/projects/:projectId', projectController.get)
    // .patch('/projects/:projectId', projectController.modify)
    // .delete('/projects/:projectId', projectController.remove)
  );
};

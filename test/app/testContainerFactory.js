const path = require('path');
const axios = require('axios');
const AxiosMockAdapter = require('axios-mock-adapter');
const containerFactory = require('../../src/containerFactory');

function createContainer() {
  const container = containerFactory.createContainer();
  const entries = [];

  container.register('axiosMock', function $axiosMock() {
    return new AxiosMockAdapter(axios);
  });

  entries.forEach((entry) => container.load(path.join(__dirname, entry)));

  return container;
}

module.exports = {
  createContainer
};

const ethers = require('ethers');
const accounts = [];

module.exports = function $walletService(config) {
  return {
    createWallet,
    getDeployerWallet,
    getWallet,
    getWalletData,
    getWalletsData
  };

  function getDeployerWallet() {
    return ethers.Wallet.fromMnemonic(config.deployerMnemonic).connect(config.provider);
  }

  async function createWallet() {
    // This may break in some environments, keep an eye on it
    const wallet = ethers.Wallet.createRandom().connect(config.provider);
    const newAccount = {
      id: accounts.length,
      address: wallet.address,
      privateKey: wallet.privateKey
    };

    accounts.push(newAccount);
    return newAccount;
  }

  function getWalletsData() {
    return accounts;
  }

  function getWalletData(index) {
    return accounts[index];
  }

  function getWallet(index) {
    return new ethers.Wallet(accounts[index - 1].privateKey, config.provider);
  }
};

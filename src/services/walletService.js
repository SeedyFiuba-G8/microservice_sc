const ethers = require('ethers');

module.exports = function $walletService(config, walletRepository) {
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

  async function createWallet(walletId) {
    // This may break in some environments, keep an eye on it
    const wallet = ethers.Wallet.createRandom().connect(config.provider);
    const newWalletData = {
      walletId: walletId,
      address: wallet.address,
      privateKey: wallet.privateKey
    };

    await walletRepository.create(newWalletData);
    return newWalletData;
  }

  async function getWalletsData() {
    const wallets = await walletRepository.get();
    return wallets;
  }

  async function getWalletData(walletId) {
    const walletData = await walletRepository.get({
      filters: {
        walletId
      }
    });
    if (!walletData.length) throw errors.create(404, 'No wallet found with specified id.');
    return walletData[0];
  }

  async function getWallet(walletId) {
    const walletData = getWalletData(walletId);
    return new ethers.Wallet(walletData.privateKey, config.provider);
  }
};

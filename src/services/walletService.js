const ethers = require('ethers');

module.exports = function $walletService(config, conversionUtils, errors, logger, projectRepository, walletRepository) {
  return {
    createWallet,
    getDeployerWallet,
    getFundings,
    getAllFundings,
    getWallet,
    getWalletData,
    getWalletsData,
    transfer
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

    // This is for local testing purposes.
    // We transfer eths to wallets in hardhat deployment
    if (config.network === 'localhost') {
      const tx = {
        to: wallet.address,
        value: ethers.utils.parseEther('1000')
      };

      const deployerWallet = getDeployerWallet();
      const txResponse = await deployerWallet.sendTransaction(tx);
    }

    await walletRepository.create(newWalletData);
    return newWalletData;
  }

  async function getWalletsData() {
    const wallets = await walletRepository.get();
    const balances = await Promise.all(
      wallets.map(async (walletData) => (walletData.balance = await getBalance(walletData)))
    );
    return wallets;
  }

  async function getWalletData(walletId) {
    const walletData = (
      await walletRepository.get({
        filters: {
          walletId
        }
      })
    )[0];
    if (!walletData) throw errors.create(404, 'No wallet found with specified id.');
    walletData.balance = await getBalance(walletData);
    return walletData;
  }

  /**
   * Gets the balance of a wallet
   *
   * @param {Object} walletData
   * @returns {number} wallet's balance in eths
   */
  async function getBalance(walletData) {
    const wallet = new ethers.Wallet(walletData.privateKey, config.provider);
    return conversionUtils.fromWei(await wallet.getBalance());
  }

  async function getWallet(walletId) {
    const walletData = await getWalletData(walletId);
    return new ethers.Wallet(walletData.privateKey, config.provider);
  }

  async function getFundings(walletId) {
    const fundings = await projectRepository.getFundings({ filters: { walletId } });
    return fundings;
  }

  async function getAllFundings() {
    const fundings = await projectRepository.getFundings();
    return fundings;
  }

  async function transfer(fromWalletId, toWalletAddress, amount) {
    const sourceWallet = await getWallet(fromWalletId);
    const tx = {
      to: toWalletAddress,
      value: ethers.utils.parseEther(String(amount))
    };

    const txResponse = await sourceWallet.sendTransaction(tx);

    logger.info(
      `Transferred ${amount} from walletId ${fromWalletId} to address ${toWalletAddress} in tx ${txResponse.hash}`
    );

    return txResponse.hash;
  }
};

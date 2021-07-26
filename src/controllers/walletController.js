const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

const sensitiveValues = ['privateKey'];

module.exports = function $walletController(expressify, walletService) {
  return expressify({
    create,
    get,
    getAll,
    getFundings,
    getAllFundings
  });

  /**
   * Creates a new wallet
   *
   * @returns {Promise}
   */
  async function create(req, res) {
    const newWalletData = await walletService.createWallet(uuidv4());
    return res.status(201).json(_.omit(newWalletData, sensitiveValues));
  }

  /**
   * Gets the information of an existing wallet by its id
   *
   * @returns {Promise}
   */
  async function get(req, res) {
    const walletInfo = await walletService.getWalletData(req.params.walletId);
    return res.status(200).json(_.omit(walletInfo, sensitiveValues));
  }

  /**
   * Gets the information of the project fundings made by a wallet by its id
   *
   * @returns {Promise}
   */
  async function getFundings(req, res) {
    const { walletId } = req.params;
    const fundings = await walletService.getFundings(walletId);
    return res.status(200).json(fundings);
  }

  /**
   * Gets the information of all project fundings
   *
   * @returns {Promise}
   */
  async function getAllFundings(req, res) {
    const fundings = await walletService.getAllFundings();
    return res.status(200).json(fundings);
  }

  /**
   * Gets the information of all registered wallets
   *
   * @returns {Promise}
   */
  async function getAll(req, res) {
    const wallets = await walletService.getWalletsData();
    return res.status(200).json(wallets.map((wallet) => _.omit(wallet, sensitiveValues)));
  }
};

const BigNumber = require('bignumber.js');

module.exports = function conversionUtils() {
  return {
    fromWei,
    toWei
  };

  function toWei(number) {
    const WEIS_IN_ETHER = BigNumber(10).pow(18);
    return BigNumber(number).times(WEIS_IN_ETHER).toFixed();
  }

  function fromWei(bigNumber) {
    const WEIS_IN_ETHER = BigNumber(10).pow(18);
    return bigNumber / WEIS_IN_ETHER;
  }
};

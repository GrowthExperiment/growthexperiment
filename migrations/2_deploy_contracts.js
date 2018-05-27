const GrowthExperimentCoin = artifacts.require('./GrowthExperimentCoin.sol');
const Election = artifacts.require('./Election.sol');

module.exports = function(deployer, network, accounts) {

  /*
    return deployer
        .then(() => {
            return deployer.deploy(GrowthExperimentCoin);
        });
   */
  deployer.then(async () => {
    let timestamp = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    let allowance = web3.toWei(5, 'finney');
    let startingBalance = web3.toWei(1000, 'ether');
    let nOfficials = 2;
    let startElection = timestamp + 1;
    let timeElection  = 3600*24;
    let fund = '0xcf5a77160A70060c8a0F355B61D319538aC20830'; // account #9 in ganache

    // await deployer.deploy(GrowthExperimentCoin, allowance, nOfficials, startElection, timeElection, fund);
    await deployer.deploy(GrowthExperimentCoin, allowance, startingBalance, nOfficials, fund);
    let gcoin = await GrowthExperimentCoin.deployed();
    console.log("Migration timestamp: " + timestamp + " of type " + typeof timestamp);
    console.log("gcoin.address: " + gcoin.address +
      ", GrowthExperiment.address: " + GrowthExperimentCoin.address);
    // await deployer.deploy(Election, GrowthExperimentCoin.address, timestamp+1, timestamp+1+3600*24, 1);
  });
};

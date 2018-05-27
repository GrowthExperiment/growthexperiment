import expectThrow from 'zeppelin-solidity/test/helpers/expectThrow'; // ES6 syntax

const GrowthExperimentCoin = artifacts.require('GrowthExperimentCoin');
const Election = artifacts.require('Election');

function delay(milliseconds) {
  return new Promise(function(resolve) {
      setTimeout(resolve, milliseconds)
  });
}

function moveClockForward(seconds) {
  web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [seconds], id: 0})
  web3.currentProvider.send({jsonrpc: "2.0", method: "evm_mine", params: [], id: 0})
}

contract('GrowthExperimentCoin', async(accounts) => {

  it("should start with 0 balance", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let balance = await inst.balanceOf.call(accounts[0]);
    assert.equal(balance.valueOf(), 0);
  });

  it("should have 5 finney/s allowance", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let allowance = await inst.allowancePerSecond.call();
    assert.equal(allowance.valueOf(), web3.toWei(5, "finney"));
  });

  it("should allow to verify users", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let tx = await inst.verify(accounts[0]);
    tx = await inst.verify(accounts[1]);
    let activated_at = await inst.activations.call(accounts[0]);
    assert(activated_at.toNumber() > 0, "Account 0 activated_at is " + activated_at);
    activated_at = await inst.activations.call(accounts[1]);
    assert(activated_at.toNumber() > 0, "Account 1 activated_at is " + activated_at);
    console.log("Accounts 0 and 1 activated at " + activated_at);
    console.log("Block timestamp " + web3.eth.getBlock(web3.eth.blockNumber).timestamp);
  });

  /* Commented out because verifiedAccounts is a private variable
  it("should keep count of active accounts", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let n = await inst.verifiedAccounts.call();
    console.log("Number of active accounts: " + n);
    assert(n==2, "# active accounts is " + n);
  });
  */
  it("should allow to check verification of users with isVerified", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let v = await inst.isVerified.call(accounts[1]);
    assert(v, "Account 1 was verified.");
    v = await inst.isVerified.call(accounts[5]);
    assert(!v, "Account 5 was not verified.");
  });

  it("just move clock forward and adds a transaction to block chain to get timestamp up", async() => {
    moveClockForward(5);
    let inst = await GrowthExperimentCoin.deployed();
    let tx = await inst.verify(accounts[2]);
    let activated_at = await inst.activations.call(accounts[2]);
    assert(activated_at.toNumber() > 0, "Account 2 activated_at is " + activated_at);
    console.log("Account 2 activated at " + activated_at);
  });

  it("should have enough balance to transfer something to account 1", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let tx = await inst.transfer(accounts[1], 1);
    console.log("Block timestamp " + web3.eth.getBlock(web3.eth.blockNumber).timestamp);
  });

  it("should increase total supply when verifying more accounts", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let supply = await inst.totalSupply.call();
    console.log("Total supply " + supply);
    assert(supply>0, "Total supply is still at " + supply);
  });

  it("should have some balance on account 0, after verification", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let balance = await inst.balanceOf.call(accounts[0]);
    console.log('Account 0 balance after verification ' + balance.toString());
    assert(balance.toNumber() > 0, "Account 0 balance after verification is " + balance);
  });
    
  it("should have some balance on account 1, after verification", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let balance = await inst.balanceOf.call(accounts[1]);
    console.log('Account 1 balance after verification ' + balance.toString());
    assert(balance.toNumber() > 0, "Account 1 balance after verification is " + balance);
  });

  it("should have enough balance on account 1 to return something to account 0", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let balance = await inst.balanceOf.call(accounts[1]);
    let tx = await inst.transfer(accounts[0], 1, { from: accounts[1] });
  });

  it("should allow owner to change admin", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let tx = await inst.transferAdmin(accounts[1]);
    let newAdmin = await inst.admin.call();
    assert.equal(newAdmin, accounts[1], "New admin was not transferred to account 1");
  });

  it("should allow admin to change identity service", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let tx = await inst.transferIdentityService(accounts[2], { from: accounts[1] });
    let newService = await inst.identityService.call();
    assert.equal(newService, accounts[2], "New identity service was not transferred to account 2");
  });

  it("should not allow non-owners to change admin", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    await expectThrow(inst.transferAdmin(accounts[5], { from: accounts[4] }));
  });

  it("should not allow non-owners and non-admin to change identity service", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    await expectThrow(inst.transferIdentityService(accounts[5], { from: accounts[4] }));
  });

  it("should allow identity service to recover and transfer an account", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let oldBalance = await inst.balanceOf(accounts[1]);
    console.log('Account 1 balance: ' + oldBalance.toString());
    let tx = await inst.recover(accounts[1], accounts[5], { from: accounts[2] });
    let newBalance = await inst.balanceOf(accounts[5]);
    console.log('Account 5 balance: ' + newBalance.toString());
    assert.equal(oldBalance.toNumber(), newBalance.toNumber(), "Balances of old and new account do not match");
  });

  it("should not allow non-identity service to transfer or recover accounts", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    await expectThrow(inst.recover(accounts[5], accounts[1], { from: accounts[4] }));
  });

  it("should not allow anybody to open first election, other than owner or admin", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let timestamp = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    let startElection = timestamp + 1;
    let timeElection  = 3600*24;
    await expectThrow(inst.firstElection(startElection, timeElection, { from: accounts[4] }));
  });

  it("should not allow openElection to work on first election", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let timestamp = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    let startElection = timestamp + 1;
    let timeElection  = 3600*24;
    await expectThrow(inst.openElection(startElection, timeElection, { from: accounts[4] }));
  });

  it("should allow owner to launch first election", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let timestamp = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    let startElection = timestamp;
    let timeElection  = 3600*24;
    let election = await inst.firstElection(startElection, timeElection, { from: accounts[0] });
    console.log('Election opened, start at ' + startElection);
  });

  it("should still have an open election", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    let inst = Election.at(election);

    console.log("Block timestamp " + web3.eth.getBlock(web3.eth.blockNumber).timestamp);
    let end = await inst.end.call()
    console.log("Election ends at " + end);

    let hasEnded = await inst.hasEnded.call();
    assert(!hasEnded, "Election has already ended!");
  });

  it("should allow verified accounts to run for election", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    let inst = Election.at(election);
    let v1 = await coin.isVerified(accounts[2]);
    let v2 = await coin.isVerified(accounts[5]);
    console.log("Account 2 verified " + v1);
    console.log("Account 5 verified " + v2);
    await inst.run("Account Two", { from: accounts[2] });
    await inst.run("Account Five", { from: accounts[5] });
  });

  it("should not allow unverified accounts to run for election", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    let inst = Election.at(election);

    await expectThrow(inst.run("Account six", { from: accounts[6] }));
  });

  it("should allow verified accounts to vote for candidates", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    let inst = Election.at(election);

    await inst.vote(accounts[2], { from: accounts[2] });
    await inst.vote(accounts[2], { from: accounts[5] });
  });

  it("should not allow unverified accounts to vote", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    let inst = Election.at(election);

    await expectThrow(inst.vote(accounts[2], { from: accounts[6] }));
  });

  it("should not close election if not ended yet", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    let inst = Election.at(election);
    await expectThrow(inst.closeElection());
  });

  it("should close election", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    let inst = Election.at(election);
    // move forward the clock by one day because election needs at least one day to run
    moveClockForward(3600*24+1);

    await inst.closeElection();
    let winner = await inst.winners.call(0);
    console.log("Winner: " + winner);
    assert.equal(winner[0], accounts[2]);
  });

  it("should not allow to close election a second time", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    let inst = Election.at(election);
    await expectThrow(inst.closeElection());
  });


});

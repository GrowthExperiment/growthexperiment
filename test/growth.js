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
    let tx = await inst.transfer(accounts[1], 1000);
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
    let tx = await inst.transfer(accounts[0], 1000, { from: accounts[1] });
    let total = await inst.totalSupply.call();
    console.log("Total supply now at " + total);
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
    // Waiting 1 sec before testing account transfers
    await delay(1000);

    let inst = await GrowthExperimentCoin.deployed();
    let oldBalance = await inst.balanceOf.call(accounts[1]);
    let timestamp1 = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    console.log('Account 1 balance: ' + oldBalance.toString() + ' at time ' + timestamp1);
    let tx = await inst.recover(accounts[1], accounts[5], { from: accounts[2] });
    let timestamp2 = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    let allowance = await inst.allowancePerSecond.call();
    let newBalance = await inst.balanceOf.call(accounts[5]);
    console.log('Account 5 balance: ' + newBalance.toString() + ' at time ' + timestamp2);
    assert.equal(oldBalance.toNumber() + (timestamp2-timestamp1) * allowance, newBalance.toNumber(), "Balances of old and new account do not match");
  });

  it("should not allow non-identity service to transfer or recover accounts", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    await expectThrow(inst.recover(accounts[5], accounts[1], { from: accounts[4] }));
  });


  /* Tests on election */
  it("should not allow anybody to open first election, other than owner or admin", async() => {
    // Waiting 1 sec before testing elections
    await delay(1000);

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

    console.log("First election contract at address " + election);
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

    await coin.closeElection();
    //let winner = await inst.winners.call(0);
    let winner = await coin.officials.call(0);
    //console.log("Winner: " + winner);
    console.log("Elected officials: " + winner);
    assert.equal(winner, accounts[2]);
  });

  it("should not allow to close election a second time", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    let inst = Election.at(election);
    await expectThrow(inst.closeElection());
  });

  it("should allow anyone to openElection after first one closed", async() => {
    let inst = await GrowthExperimentCoin.deployed();
    let timestamp = web3.eth.getBlock(web3.eth.blockNumber).timestamp;
    let startElection = timestamp + 1;
    let timeElection  = 3600*24;
    await inst.openElection(startElection, timeElection, { from: accounts[4] });
  });

  it("should allow another election to run", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let election = await coin.election.call();
    console.log("Second election contract at address " + election);
    let inst = Election.at(election);
    await inst.run("Account Two", { from: accounts[2] });
    await inst.run("Account Five", { from: accounts[5] });
    await delay(1000);
    await inst.vote(accounts[2], { from: accounts[2] });
    await inst.vote(accounts[5], { from: accounts[5] });
    await inst.vote(accounts[5], { from: accounts[0] });
    moveClockForward(3600*24+1);
    let c0 = await inst.candidateAddresses.call(0);
    let c1 = await inst.candidateAddresses.call(1);
    let candidate0 = await inst.candidates.call(c0);
    let candidate1 = await inst.candidates.call(c1);
    console.log("Candidate 0: " + candidate0);
    console.log("Candidate 1: " + candidate1);

    await coin.closeElection();
    await delay(1000);
    let winner = await coin.officials.call(0);
    console.log("Elected officials: " + winner);
    assert.equal(winner, accounts[5]);
  });

  /* Tests on owner and community funds */
  it("should accrue 2% of all coins to owner's account", async() => {
    // Waiting 1 sec before testing owner and community funds
    await delay(1000);
    let coin = await GrowthExperimentCoin.deployed();
    let totalCoins = await coin.totalSupply.call();
    let ownerCoins = await coin.balanceOf.call(accounts[0]);
    let ownerStake = await coin.ownerStake.call();
    console.log("Block timestamp " + web3.eth.getBlock(web3.eth.blockNumber).timestamp);
    console.log("Total coins: " + web3.fromWei(totalCoins, 'ether') + 
      "\tOwner coins: " + web3.fromWei(ownerCoins, 'ether').toString(10) +
      " (" + ownerStake + "bps)");
    let acc = web3.toBigNumber(0);
    for(let i=0; i<10; i++) {
      let balance = await coin.balanceOf.call(accounts[i]);
      console.log("Balance of account #" + i + ": " + balance);
      acc = acc.plus(balance);
    }
    console.log("Block timestamp " + web3.eth.getBlock(web3.eth.blockNumber).timestamp);
    console.log("Accumulated sum: " + web3.fromWei(acc, 'ether').toString(10));
    assert.equal(totalCoins.toNumber(), acc.toNumber());
  });

  it("Default inflation rate is at 0, so community funds should be 0", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    let communityFunds = await coin.balanceOfCommunityFunds.call();
    console.log("Community funds: " + communityFunds.toString(10));
    assert.equal(communityFunds.toNumber(), 0);
  });

  it("Get officials to set inflation rate and check community funds", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    await coin.setInflationRate(300, {from: accounts[2]});
    moveClockForward(3600*24*365);
    let communityFunds = await coin.balanceOfCommunityFunds.call();
    let totalCoins = await coin.totalSupply.call();
    console.log("Community funds: " + web3.fromWei(communityFunds, 'ether'));
    console.log("Total coins: " + web3.fromWei(totalCoins, 'ether'));
    assert(communityFunds.toNumber() > 0);
  });

  it("should allow officials to spend community funds", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    await coin.transferCommunityFunds(accounts[9], web3.toWei(1, 'ether'), { from: accounts[2] });
    let communityFunds = await coin.balanceOfCommunityFunds.call();
    console.log("Community funds: " + web3.fromWei(communityFunds, 'ether'));

  });

  it("should not allow non-officials to spend community funds", async() => {
    let coin = await GrowthExperimentCoin.deployed();
    await expectThrow(
      coin.transferCommunityFunds(accounts[9], web3.toWei(1, 'ether'),
        { from: accounts[7] }));
    let communityFunds = await coin.balanceOfCommunityFunds.call();
    console.log("Community funds: " + web3.fromWei(communityFunds, 'ether'));
  });
});

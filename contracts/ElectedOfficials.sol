pragma solidity ^0.4.23;

import './StandardBasicIncomeToken.sol';
import './Election.sol';

contract ElectedOfficials is StandardBasicIncomeToken {
  uint public nOfficials;
  uint public nextElectionDate;
  uint public electionLength;
  Election public election;

  // Address where taxes are collected
  // Only elected officials can move tokens out of it
  address public communityFund;

  // List of public elected officials
  address[] public officials;

  // Inflation rate in basis points adding funds to the community funds address
  uint256 _inflationRate;
  uint256 constant MAX_INFLATION_RATE = 500;
  uint256 _lastInflationUpdate;
  uint256 _inflationStock;

  // Timestamp the contract was created
  uint256 public createdAt;

  event CommunityFundsTransfer(address indexed official, address indexed recipient, uint256 amount);
  event InflationRateChanged(address indexed official, uint256 rate);

  /**
   * @dev Throws if called by any account other than elected officials.
   */
  modifier onlyOfficials() {
    bool found = false;
    for(uint i=0; i<officials.length; i++) {
      if(officials[i] == msg.sender) {
        found = true;
        break;
      }
    }
    require(found);
    _;
  }

  constructor(uint256 _allowance, uint256 _startingBalance, uint256 _ownerStake,
              uint256 _nOfficials, address _communityFund)
  StandardBasicIncomeToken(_allowance, _startingBalance, _ownerStake)
  public {
    nOfficials = _nOfficials;
    _inflationRate = 0;
    communityFund = _communityFund;
    createdAt = now;
  }

  function firstElection(uint _electionDate, uint _electionLength) public onlyOwnerOrAdmin
  returns (Election) {
    require(election == address(0), "After first election, you must call openElection");
    nextElectionDate = _electionDate;
    electionLength = _electionLength;

    election = new Election(this, nextElectionDate, nextElectionDate + electionLength, nOfficials);
    return election;
  }

  function openElection(uint _electionDate, uint _electionLength) public
  returns (Election) {
    require(election != address(0), "For first election, you must call firstElection");
    require(election.hasClosed(), "Election still open.");
    nextElectionDate = _electionDate;
    electionLength = _electionLength;

    election = new Election(this, nextElectionDate, nextElectionDate + electionLength, nOfficials);
    return election;
  }

  function closeElection() public {
    election.closeElection();
    address[] memory winners = election.getWinnersAddresses();
    for(uint i=0; i<winners.length; i++) {
      officials.push(winners[i]);
    }
  }

  function getInflationRate() view public returns (uint256) {
    return _inflationRate;
  }

  function setInflationRate(uint256 rate) public onlyOfficials {
    require(rate <= MAX_INFLATION_RATE);
    _inflationRate = rate;
    emit InflationRateChanged(msg.sender, _inflationRate);
  }

  function balanceOfCommunityFunds() public returns (uint256) {
    if(_lastInflationUpdate==0) {
      _lastInflationUpdate = createdAt;
    }
    uint256 inflationFlow = totalSupply() * 
      (now - _lastInflationUpdate) * _inflationRate / 10000 / 3600 / 24 / 365;
    _inflationStock += inflationFlow;
    _lastInflationUpdate = now;
    int256 availableFunds = balances[communityFund] + int256(_inflationStock);
    require(availableFunds>balances[communityFund]);
    require(availableFunds>0);
    return uint256(availableFunds);
  }

  function transferCommunityFunds(address _to, uint256 _value) public onlyOfficials returns (bool) {
    require(_to != address(0));
    require(_value <= balanceOfCommunityFunds());

    int256 new_balance = balances[communityFund] - int256(_value);
    require( new_balance <= balances[communityFund] );
    balances[communityFund] = new_balance;

    new_balance = balances[_to] + int256(_value);
    require( new_balance >= balances[_to] );
    balances[_to] = new_balance;

    emit Transfer(communityFund, _to, _value);
    emit CommunityFundsTransfer(msg.sender, _to, _value);
    return true;
  }
}

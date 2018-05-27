pragma solidity ^0.4.23;

// import './StandardBasicIncomeToken.sol';
import './ElectedOfficials.sol';

contract GrowthExperimentCoin is ElectedOfficials {

  string public name = "Growth Experiment Coin";
  string public symbol = "GEC";
  uint8 public decimals = 18;

  constructor(uint _allowance, uint _startingBalance, uint _nOfficials, address _communityFund)
  ElectedOfficials(_allowance, _startingBalance, _nOfficials, _communityFund)
  public {

  }

}

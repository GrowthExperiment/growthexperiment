pragma solidity ^0.4.23;

// import './StandardBasicIncomeToken.sol';
import './ElectedOfficials.sol';

contract GrowthExperimentCoin is ElectedOfficials {

  string public name = "Growth Experiment Coin";
  string public symbol = "GEC";
  uint8 public decimals = 18;

  constructor(uint256 _allowance, uint256 _startingBalance, uint256 _ownerStake,
              uint256 _nOfficials, address _communityFund)
  ElectedOfficials(_allowance, _startingBalance, _ownerStake, _nOfficials, _communityFund)
  public {

  }

}

pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import './Adminable.sol';
import './VerifiedToken.sol';

/**
 * @title Basic income token
 * @dev Basic version of StandardToken, with no allowances. Added balances growing with time.
 */
contract BasicIncomeToken is ERC20Basic, Adminable, VerifiedToken {
  using SafeMath for uint256;

  // This is a signed int because it can go negative, offset by tokens accruing over time on top
  mapping(address => int256) balances;

  // Mapping containing timestamp at which address identity was verified
  mapping(address => uint) public activations;

  // Tokens per second
  uint256 public allowancePerSecond;

  // Amount of tokens at account verification
  uint256 public startingBalance;

  uint256 totalSupply_;

  // Timestamp of last account verification
  uint256 lastVerification;

  // Number of verified accounts
  uint256 verifiedAccounts;

  event AccountVerified(address indexed account, uint timestamp);
  event AccountRecovered(address indexed fromAccount, address indexed toAccount);

  function BasicIncomeToken(uint256 _allowancePerSecond, uint256 _startingBalance) public {
    allowancePerSecond = _allowancePerSecond;
    startingBalance = _startingBalance;
  }

  /**
   * @dev total number of tokens in existence
   */
  function totalSupply() public view returns (uint256) {
    uint256 sinceLastVerification = now - lastVerification;
    return totalSupply_ + (verifiedAccounts * allowancePerSecond * sinceLastVerification);
  }

  /**
   * @dev transfer token for a specified address
   * @param _to The address to transfer to.
   * @param _value The amount to be transferred.
   */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balanceOf(msg.sender));

    int256 new_balance = balances[msg.sender] - int256(_value);
    require( new_balance <= balances[msg.sender] );
    balances[msg.sender] = new_balance;

    new_balance = balances[_to] + int256(_value);
    require( new_balance >= balances[_to] );
    balances[_to] = new_balance;

    Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
   * @dev Gets the balance of the specified address.
   * @param _owner The address to query the the balance of.
   * @return An uint256 representing the amount owned by the passed address.
   */
  function balanceOf(address _owner) public view returns (uint256) {
    // Only for addresses whose identity was verified 
    if(activations[_owner]>0) {
      int256 allowanceMatured = int256((now - activations[_owner]) * allowancePerSecond);
      require(allowanceMatured >= 0);
      int256 netBalance = allowanceMatured + balances[_owner] + int256(startingBalance);
      require(netBalance >= 0);
      return uint256(netBalance);
    }
    if(balances[_owner] > 0) {
      return uint256(balances[_owner]);
    }
    return 0;
  }

  /**
    * @notice Allows an identity service to verify identify of an address. Once verified,
    * the account will start earning the basic income.
    * @param _account Address to be verified.
    * @return Timestamp correspending to verification.
    */
  function verify(address _account) public onlyIdentityService returns (uint256) {
    if (activations[_account] == 0) {
      if (lastVerification>0) {
        uint256 sinceLastVerification = now - lastVerification;
        totalSupply_ += (verifiedAccounts * allowancePerSecond * sinceLastVerification);
      }
      lastVerification = now;
      verifiedAccounts += 1;
      activations[_account] = now;
      AccountVerified(_account, now);
    }
    return activations[_account];
  }

  function freeze(address _account) public onlyIdentityService {
  }

  function isVerified(address _account) public view returns(bool) {
    return (activations[_account]>0);
  }

  function recover(address _fromAccount, address _toAccount) public onlyIdentityService returns (uint256) {
    require(_fromAccount != address(0));
    require(_toAccount != address(0));
    activations[_toAccount] = activations[_fromAccount];
    activations[_fromAccount] = 0;
    balances[_toAccount] = balances[_fromAccount];
    balances[_fromAccount] = 0;
    AccountRecovered(_fromAccount, _toAccount);
  }
}

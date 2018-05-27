pragma solidity ^0.4.18;

contract VerificationService {
  /**
    * @notice   This method must be implemented by a verification service to verify
    *           unique identify of an account.
    * @param    _account Address of account to be verified.
    * @return   Timestamp at which account was verified.
    */
  function verify(address _account) public returns (uint256);
}

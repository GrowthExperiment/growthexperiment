pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title Adminable
 * @dev The Adminable contract has an admin address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Adminable is Ownable {
  address public admin;
  address public identityService;

  event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
  event IdentityServiceTransferred(address indexed previousService, address indexed newService);

  function Adminable() public {
    admin = owner;
    identityService = owner;
  }

  /**
   * @dev Throws if called by any account other than the admin.
   */
  modifier onlyAdmin() {
    require(msg.sender == admin);
    _;
  }

  /**
   * @dev Throws if called by any account other than the owner or the admin.
   */
  modifier onlyOwnerOrAdmin() {
    require(msg.sender == admin || msg.sender == owner);
    _;
  }

  /**
   * @dev Throws if called by any account other than the identity service.
   */
  modifier onlyIdentityService() {
    require(msg.sender == identityService);
    _;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newAdmin.
   * @param newAdmin The address to transfer admin rights to.
   */
  function transferAdmin(address newAdmin) public onlyOwner {
    require(newAdmin != address(0));
    AdminTransferred(admin, newAdmin);
    admin = newAdmin;
  }

  /**
   * @dev Allows the current admin to transfer identity verification service to a new address.
   * @param newService The address to transfer identity rights to.
   */
  function transferIdentityService(address newService) public onlyOwnerOrAdmin {
    require(newService != address(0));
    IdentityServiceTransferred(identityService, newService);
    identityService = newService;
  }
}

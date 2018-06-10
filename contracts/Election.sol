pragma solidity ^0.4.23;

import './VerifiedToken.sol';

/**
 * @notice Election contains functions and variables to call and hold an election of winners.
 */ 
contract Election {
  struct Candidate {
    address account;
    string name;
    uint voteCount;
  }

  VerifiedToken public token;
  Candidate[] public winners;
  address[] public candidateAddresses;
  mapping(address => Candidate) public candidates;
  mapping(address => bool) voters;

  uint public nWinners;
  uint public start;
  uint public end;
  bool closed;

  event Winner(address official, string name, uint256 votes);

  constructor(VerifiedToken _token, uint _start, uint _end, uint _nWinners) public {
    require(_start >= now, "Start date must be in the future.");
    require(_end - _start >= 3600 * 24, "Need at least one day to hold elections.");
    require(_end - _start <= 3600 * 24 * 7, "Elections can be open for 7 days at most.");
    require(_end > now, "End date must be in the future.");
    require(_end < now + 365 * 3600 * 24, "End date can't be more than one year from now.");

    require(_nWinners > 0, "You need at least one winner for the elections.");
    token = _token;
    start = _start;
    end = _end;
    nWinners = _nWinners;
    closed = false;
  }

  function run(string name) public {
    require(!hasEnded(), "Election has already ended.");
    require(token.isVerified(msg.sender), "Sender identity not verified.");
    candidates[msg.sender] = Candidate(msg.sender, name, 0);
    candidateAddresses.push(msg.sender);
  }

  function vote(address account) public {
    require(hasStarted(), "Election hasn't started yet.");
    require(!hasEnded(), "Election has already ended.");
    require(token.isVerified(msg.sender), "Sender not allowed to vote.");
    require(voters[msg.sender] == false, "Sender has already voted.");
    Candidate storage _candidate = candidates[account];
    require(_candidate.account != address(0), "Account is not a candidate");
    _candidate.voteCount += 1;
    voters[msg.sender] = true;
  }

  function contains(uint[] a, uint target) internal pure returns (bool) {
    for (uint i = 0; i < a.length; i++) {
      if(a[i] == target) return true;
    }
    return false;
  }

  /// @dev Computes the winning candidate taking all
  /// previous votes into account.
  function winningCandidate(uint[] exclusions) public view returns (uint winner) {
    uint winningVoteCount = 0;
    for (uint i = 0; i < candidateAddresses.length; i++) {
      if (exclusions.length>0 && contains(exclusions, i)) continue;
      if (candidates[candidateAddresses[i]].voteCount > winningVoteCount) {
        winningVoteCount = candidates[candidateAddresses[i]].voteCount;
        winner = i;
      }
    }
  }

  function hasStarted() public view returns (bool) {
    return now >= start;
  }

  function hasEnded() public view returns (bool) {
    return now > end;
  }

  function hasClosed() public view returns (bool) {
    return closed;
  }

  function closeElection() public {
    require(hasEnded(), "Election not ended yet.");
    require(!closed, "Election already closed.");
    uint[] memory _winners = new uint[](nWinners);
    winners.length = 0;
    Candidate memory w;
    for (uint i = 0; i < nWinners; i++) {
      uint winner = winningCandidate(_winners);
      _winners[i] = winner;
      w = candidates[candidateAddresses[winner]];
      winners.push(w);
      emit Winner(w.account, w.name, w.voteCount);
    }
    closed = true;
  }

  function getWinnersAddresses() view public returns (address[] addrs) {
    addrs = new address[](winners.length);
    for(uint i=0; i<winners.length; i++) {
      addrs[i] = winners[i].account;
    }
  }
}

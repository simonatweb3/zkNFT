// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Pomp is SemaphoreGroups, Ownable {
  enum ASSET {
    ETH,
    BNB
  }

  enum RANGE {
      RANGE_0,       // >0
      RANGE_1_10,    // 1~10
      RANGE_10_100,  // 10~100
      RANGE_100      // >100
  }

  // asset_type --> asset_range --> merkle tree)
  mapping(uint => mapping(uint => uint)) groups;

  // external nullifier, increase per verify
  mapping(uint => mapping(uint => uint)) salts;  // random?
  mapping(uint => bool) nullifierHashes;

  constructor() Ownable() {
    // init build-in pomp pool
    // createPompPool
  }

  function createPompPool(
    uint asset,
    uint range
  ) public onlyOwner {
    // createGroup
  }

  // batch mint
  function mint(
    uint[] calldata identity,
    uint asset,
    uint range
  ) public onlyOwner {
    // addMember

    // sbt[id] = identity
  }

  function verify() public {
    // PompVerifier.verifyProof()
  }

}
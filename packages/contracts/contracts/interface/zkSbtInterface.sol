// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

/**
 * @title zkSBT interface
 * @notice Contains the minimum interfaces needed to interact with zkSBT.
 */
interface ZkSbtInterface {
  /**
   * @dev Allows an operator to mint zkSBT and initialize corresponding info.
   *
   * @param identityCommitment //the identity
   * @param asset //asset type this sbt represents
   * @param range The amount of tokens to transfer.
   * @param sbtId The amount of tokens to transfer.
   *
   * @return success True if the mint process was successful.
   */
  function mintWithSbtId(
    uint256 identityCommitment, //record identity commitment of user
    uint256 asset, //mint id
    uint range,
    uint256 sbtId //sbt id in the per sbt identity
  ) external returns (bool success);
}

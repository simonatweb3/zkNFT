import { ethers } from "hardhat";
import { randomHex } from "./encoding";

export function generateRandomIdentityCommitment() {
  let hexIdentityCommitment = randomHex(32);

  hexIdentityCommitment = hexIdentityCommitment.slice(
    2,
    hexIdentityCommitment.length
  );

  hexIdentityCommitment = "0x" + hexIdentityCommitment.padStart(64, "0");

  const zkAddress = hexIdentityCommitment.slice(
    hexIdentityCommitment.length - 40,
    hexIdentityCommitment.length
  );

  return {
    identityCommitment: ethers.toBigInt(hexIdentityCommitment),
    zkAddress,
  };
}

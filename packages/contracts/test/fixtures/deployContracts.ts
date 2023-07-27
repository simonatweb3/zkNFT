import { ethers } from "hardhat";

import { randomHex } from "../../utils/encoding";
import { faucet } from "../../utils/faucet";

export async function deployContracts() {
  const { provider } = ethers;

  const ownerOfZkSbtContract = new ethers.Wallet(randomHex(32), provider);
  const operatorOfZkSbtContract = new ethers.Wallet(randomHex(32), provider);
  const user_1 = new ethers.Wallet(randomHex(32), provider);
  const user_2 = new ethers.Wallet(randomHex(32), provider);
  const MockPompAddress = new ethers.Wallet(
    randomHex(32),
    provider
  ).getAddress();

  await faucet(ownerOfZkSbtContract.address, provider);
  await faucet(operatorOfZkSbtContract.address, provider);
  await faucet(user_1.address, provider);
  await faucet(user_2.address, provider);

  // deploy zkSBT
  const ZkSBTFactory = await ethers.getContractFactory(
    "ZkSBT",
    ownerOfZkSbtContract
  );

  const zkSBT = await ZkSBTFactory.deploy(MockPompAddress);

  return {
    ownerOfZkSbtContract,
    operatorOfZkSbtContract,
    user_1,
    user_2,
    zkSBT,
  };
}

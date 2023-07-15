import { ethers } from "hardhat";

import { randomHex } from "../../utils/encoding";

import { keccak256 } from "ethers/lib.commonjs/crypto";
import { toUtf8Bytes } from "ethers/lib.commonjs/utils";

import { faucet } from "../../utils/faucet";
import { ZkSBT, Pomp } from "../../typechain-types";

export async function deployContracts() {
  let zkSBT: ZkSBT;
  let pomp: Pomp;

  const { provider } = ethers;

  const ownerOfPompContract = new ethers.Wallet(randomHex(32), provider as any);
  const ownerOfZkSbtContract = new ethers.Wallet(
    randomHex(32),
    provider as any
  );
  const operatorOfZkSbtContract = new ethers.Wallet(
    randomHex(32),
    provider as any
  );
  const user_1 = new ethers.Wallet(randomHex(32), provider as any);

  await faucet(ownerOfPompContract.address, provider as any);
  await faucet(ownerOfZkSbtContract.address, provider as any);
  await faucet(operatorOfZkSbtContract.address, provider as any);
  await faucet(user_1.address, provider as any);

  // deploy Pomp
  let PompFactory = await ethers.getContractFactory(
    "Pomp",
    ownerOfPompContract
  );

  pomp = await PompFactory.deploy();

  // deploy zkSBT
  let ZkSBTFactory = await ethers.getContractFactory(
    "ZkSBT",
    ownerOfZkSbtContract
  );

  zkSBT = await ZkSBTFactory.deploy(await pomp.getAddress());

  return {
    ownerOfPompContract,
    ownerOfZkSbtContract,
    operatorOfZkSbtContract,
    user_1,
    pomp,
    zkSBT,
  };
}

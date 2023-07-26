import { ethers } from "hardhat";

import { randomHex } from "../../utils/encoding";
import { faucet } from "../../utils/faucet";
import * as circomlibjs from "circomlibjs";
import {
  PoseidonT3__factory,
  PompVerifier__factory,
  Pomp,
} from "../../typechain-types";
import { Wallet } from "ethers";

export async function deployPomp(owner: Wallet) {
  // deploy contract : poseidon(2)
  const NINPUT = 2;
  const poseidonABI = circomlibjs.poseidonContract.generateABI(NINPUT);
  const poseidonBytecode = circomlibjs.poseidonContract.createCode(NINPUT);
  const PoseidonLibFactory = new ethers.ContractFactory(
    poseidonABI,
    poseidonBytecode,
    owner
  );
  const poseidonLib = await PoseidonLibFactory.deploy();
  //await poseidonLib.deployed()
  const pt3 = PoseidonT3__factory.connect(
    await poseidonLib.getAddress(),
    owner
  );
  console.log("PT3 : ", await pt3.getAddress());

  // deploy contract : Incremental Binary Tree
  const IncrementalBinaryTreeLibFactory = await ethers.getContractFactory(
    "IncrementalBinaryTree",
    {
      libraries: {
        PoseidonT3: await pt3.getAddress(),
      },
    }
  );
  const incrementalBinaryTreeLib =
    await IncrementalBinaryTreeLibFactory.deploy();
  console.log("IBT : ", await incrementalBinaryTreeLib.getAddress());

  // deploy contract : verifier
  const v: Pomp = await new PompVerifier__factory(owner).deploy();

  // deploy contract : POMP
  const ContractFactory = await ethers.getContractFactory("Pomp", {
    libraries: {
      IncrementalBinaryTree: await incrementalBinaryTreeLib.getAddress(),
    },
  });

  const pc = await ContractFactory.deploy(await v.getAddress(), 10);
  return pc;
}

export async function deployContracts() {
  const { provider } = ethers;

  const ownerOfPompContract = new ethers.Wallet(randomHex(32), provider);
  const ownerOfZkSbtContract = new ethers.Wallet(randomHex(32), provider);
  const operatorOfZkSbtContract = new ethers.Wallet(randomHex(32), provider);
  const user_1 = new ethers.Wallet(randomHex(32), provider);
  const user_2 = new ethers.Wallet(randomHex(32), provider);
  const MockPompAddress = new ethers.Wallet(
    randomHex(32),
    provider
  ).getAddress();

  await faucet(ownerOfPompContract.address, provider);
  await faucet(ownerOfZkSbtContract.address, provider);
  await faucet(operatorOfZkSbtContract.address, provider);
  await faucet(user_1.address, provider);
  await faucet(user_2.address, provider);

  // deploy Pomp
  //   const pomp = await deployPomp(ownerOfPompContract);

  // deploy zkSBT
  const ZkSBTFactory = await ethers.getContractFactory(
    "ZkSBT",
    ownerOfZkSbtContract
  );

  const zkSBT = await ZkSBTFactory.deploy(MockPompAddress);

  return {
    // ownerOfPompContract,
    ownerOfZkSbtContract,
    operatorOfZkSbtContract,
    user_1,
    user_2,
    // pomp,
    zkSBT,
  };
}

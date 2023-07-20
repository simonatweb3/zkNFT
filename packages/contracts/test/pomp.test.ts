// browser non-compatible 
import { ethers } from "hardhat";

// browser compatible 
import { Signer } from "ethers";
import { Pomp, PompVerifier, PompVerifier__factory, Pomp__factory, PoseidonT3__factory } from "../typechain-types";
import { PompSdk } from "@pomp-eth/jssdk"
import * as circomlibjs from "circomlibjs"

describe("Pomp", function () {
  let owner: Signer;
  let signers: Signer[];
  let pc : Pomp
  //let sdk : PompSdk
  before(async () => {
    signers = await ethers.getSigners();
    owner = signers[10];
  });

  it("Deploy", async function () {

    // deploy contract : poseidon(2)
    const NINPUT = 2
    const poseidonABI = circomlibjs.poseidonContract.generateABI(NINPUT)
    const poseidonBytecode = circomlibjs.poseidonContract.createCode(NINPUT)
    const PoseidonLibFactory = new ethers.ContractFactory(poseidonABI, poseidonBytecode, owner)
    const poseidonLib = await PoseidonLibFactory.deploy()
    //await poseidonLib.deployed()
    const pt3 = PoseidonT3__factory.connect(await poseidonLib.getAddress(), owner)
    console.log("PT3 : " , await pt3.getAddress())

    // deploy contract : Incremental Binary Tree
    const IncrementalBinaryTreeLibFactory = await ethers.getContractFactory("IncrementalBinaryTree", {
      libraries: {
          PoseidonT3: await pt3.getAddress()
      }
    })
    const incrementalBinaryTreeLib = await IncrementalBinaryTreeLibFactory.deploy()
    console.log("IBT : " , await incrementalBinaryTreeLib.getAddress())

    // deploy contract : verifier
    const v : PompVerifier = await new PompVerifier__factory(owner).deploy()

    // deploy contract : POMP
    const ContractFactory = await ethers.getContractFactory("Pomp", {
      libraries: {
          IncrementalBinaryTree: await incrementalBinaryTreeLib.getAddress()
      }
    })

    pc = await ContractFactory.deploy(await v.getAddress(), 10)
    console.log("POMP : ", await pc.getAddress())
  });

  it("Create Pomp SDK", async function () {
    //sdk = await PompSdk.
    console.log("PompSdk : ", PompSdk)
  });

  // it("Create Pomp Pool", async function () {
  // });

  // it("Mint Pomp", async function () {
  // });

  // it("Verify Pomp Membership", async function () {
  // });
});

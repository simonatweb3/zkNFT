// browser non-compatible 
import { ethers } from "hardhat";
import { upgrades } from "hardhat" 

// browser compatible 
import { PoseidonT3__factory, ZksbtVerifier, ZksbtVerifier__factory } from "../typechain-types";
import * as circomlibjs from "circomlibjs"
import { deployContracts } from "./fixtures/deployContracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { verify, verify2, writeToEnv } from "./verify";
import * as fs from 'fs';
const hre = require('hardhat');

export async function deploy(
  owner : SignerWithAddress,
  Sbt : string,
) {
    // deploy contract : poseidon(2)
    const NINPUT = 2
    const poseidonABI = circomlibjs.poseidonContract.generateABI(NINPUT)
    const poseidonBytecode = circomlibjs.poseidonContract.createCode(NINPUT)
    const PoseidonLibFactory = new ethers.ContractFactory(poseidonABI, poseidonBytecode, owner)
    const poseidonLib = await PoseidonLibFactory.deploy()
    //await poseidonLib.deployed()
    const pt3 = PoseidonT3__factory.connect(await poseidonLib.address, owner)
    console.log("PT3 : " , await pt3.address)

    // deploy contract : Incremental Binary Tree
    const IncrementalBinaryTreeLibFactory = await ethers.getContractFactory("IncrementalBinaryTree", {
      libraries: {
        PoseidonT3: await pt3.address
      }
    })
    const incrementalBinaryTreeLib = await IncrementalBinaryTreeLibFactory.deploy()
    console.log("IBT : " , await incrementalBinaryTreeLib.address)

    // deploy contract : verifier
    const zvf : ZksbtVerifier__factory = new ZksbtVerifier__factory(owner)
    const v = await upgrades.deployProxy(zvf);
    await v.deployed();
    console.log("V : ", await v.address)
    await verify(v.address)

    // deploy contract : zkSBT
    const ContractFactory = await ethers.getContractFactory("Zksbt", {
      libraries: {
        IncrementalBinaryTree: await incrementalBinaryTreeLib.address
      }
    })

    // const params = [{
    //   _verifier : v.address,
    //   poolDepth : 10,
    //   _iSbt : Sbt
    // }]
    const params = [v.address, 10, Sbt]
    const pc = await upgrades.deployProxy(ContractFactory, params, { unsafeAllowLinkedLibraries: ['IncrementalBinaryTree'] })
    await pc.deployed()
    //const pc = await ContractFactory.deploy(v.address, 10, Sbt, {gasLimit : 10000000})
    console.log("ZKSBT : ", await pc.address)
    await verify2(pc.address, params)

    let deploy_flag = "\n\n# ++++++ depoly " + hre.hardhatArguments.network + " on " + new Date().toUTCString() + " ++++++++++++"
    fs.appendFileSync('.env', deploy_flag)
    writeToEnv("PT3", pt3.address)
    writeToEnv("IBTree", incrementalBinaryTreeLib.address)
    writeToEnv("VERIFIER", v.address)
    writeToEnv("SBT", Sbt)
    writeToEnv("ZKSBT", pc.address)
    return pc
}

if (process.env.DEPLOY_ZKSBT) {
  describe("Deploy ZKSBT", function () {
    this.timeout(6000000);
    let owner: SignerWithAddress;
    before(async () => {
      const signers = await ethers.getSigners();
      owner = signers[0];
    });

    it("Deploy", async function () {
      // deploy zkSBT contract
      const fixtures = await deployContracts(owner)
      //const ownerOfZkSbtContract = fixtures.ownerOfZkSbtContract
      const zkSBT = fixtures.zkSBT

      const pc = await deploy(owner, await zkSBT.address)

      // approve to operate zkSBT
      await zkSBT.connect(owner).setOperator(pc.address,true)
    });
  });
}

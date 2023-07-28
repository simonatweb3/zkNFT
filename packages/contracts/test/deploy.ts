// browser non-compatible 
import { ethers } from "hardhat";

// browser compatible 
import { PompVerifier, PompVerifier__factory, PoseidonT3__factory } from "../typechain-types";
import * as circomlibjs from "circomlibjs"

export async function deploy(
  owner : SignerWithAddress,
  ZkSbt : string,
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
    const v : PompVerifier = await new PompVerifier__factory(owner).deploy()
    console.log("V : ", await v.address)

    // deploy contract : POMP
    const ContractFactory = await ethers.getContractFactory("Pomp", {
      libraries: {
        IncrementalBinaryTree: await incrementalBinaryTreeLib.address
      }
    })

    const pc = await ContractFactory.deploy(await v.address, 10, ZkSbt, {gasLimit : 10000000})
    console.log("POMP : ", await pc.address)
    return pc
}

if (process.env.DEPLOY_NPO) {
  describe("Deploy NPO", function () {
    let owner: SignerWithAddress;
    before(async () => {
      const signers = await ethers.getSigners();
      owner = signers[0];
    });

    it("Deploy", async function () {
      await deploy(owner)
    });
  });
}

// browser non-compatible 
import { ethers } from "hardhat";

// browser compatible 
import { Pomp, PompVerifier, PompVerifier__factory, Pomp__factory, PoseidonT3__factory } from "../typechain-types";
import { ASSET, generateProof, PompSdk, RANGE, TREE_DEPTH } from "@pomp-eth/jssdk"
import * as circomlibjs from "circomlibjs"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Group } from "@semaphore-protocol/group"
import { dnld_aws, P0X_DIR } from "./utility";
import { resolve } from "path";

describe("Pomp", function () {
  let owner: SignerWithAddress;
  let signers: SignerWithAddress;
  let pc : Pomp
  let sdk : PompSdk
  before(async () => {
    signers = await ethers.getSigners();
    owner = signers[0];   // TODO : why not 10
    await Promise.all(
      [
        "wasm/pomp.wasm",
        "zkey/pomp.zkey",
      ].map(async (e) => {
        await dnld_aws(e);
      }),
    );

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
    sdk = await PompSdk.create(
      await pc.getAddress(),
      owner,
      resolve(P0X_DIR, "./wasm/pomp.wasm"),
      resolve(P0X_DIR, "./zkey/pomp.zkey")
    )
  });


  // it("Add Asset", async function () {
  // });

  // it("Create Pomp Pool", async function () {
  // });

  it("Mint Pomp", async function () {
    await sdk.mint(ASSET.ETH, RANGE.RANGE_100)
  });

  it("Verify Pomp Membership", async function () {
    // re-construct merkle tree offline
    const zksbt = sdk.allocate_asset_id()
    const pomp_commitment = sdk.per_sbt_commitment(zksbt)
    const group = new Group(123, TREE_DEPTH, [pomp_commitment])

    // 3/3. generate witness, prove, verify
    const proof =  await generateProof(
        sdk.identity,
        await pc.salts(ASSET.ETH, RANGE.RANGE_100),
        zksbt,
        group,
        resolve(P0X_DIR, "./wasm/pomp.wasm"),
        resolve(P0X_DIR, "./zkey/pomp.zkey")
    )

    console.log("proof : ", proof)


    await (await pc.verify(
      ASSET.ETH,
      RANGE.RANGE_100,
      proof.publicSignals.nullifierHash,
      //"1234",
      proof.proof
    )).wait()

  });
});

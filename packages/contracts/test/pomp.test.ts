// browser non-compatible 
import { ethers } from "hardhat";
import * as fs from "fs";
import * as snarkjs from "snarkjs"
import { expect } from "chai";

// browser compatible 
import { Pomp, PompVerifier, PompVerifier__factory, Pomp__factory, PoseidonT3__factory } from "../typechain-types";
import { ASSET, generateProof, hash, PompSdk, RANGE, TREE_DEPTH, unpackProof } from "@pomp-eth/jssdk"
import * as circomlibjs from "circomlibjs"
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Group } from "@semaphore-protocol/group"
import { dnld_aws, P0X_DIR } from "./utility";
import { resolve } from "path";

describe("Pomp", function () {
  this.timeout(6000000);
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

  it("Off-chain Verify Pomp Membership", async function () {
    // re-construct merkle tree offline
    const group = new Group(0, TREE_DEPTH, [sdk.identity.getCommitment()]) // group id --> root

    // 3/3. generate witness, prove, verify
    const proof =  await generateProof(
      sdk.identity,
      await pc.salts(ASSET.ETH, RANGE.RANGE_100),
      group,
      resolve(P0X_DIR, "./wasm/pomp.wasm"),
      resolve(P0X_DIR, "./zkey/pomp.zkey")
    )

    console.log("proof : ", proof)

    // off-chain verify proof
    const zkey_final = {
      type : "mem",
      data : new Uint8Array(Buffer.from(fs.readFileSync(resolve(P0X_DIR, "./zkey/pomp.zkey"))))
    }
    const vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
    expect(await snarkjs.groth16.verify(
      vKey,
      [
        proof.publicSignals.merkleRoot,
        proof.publicSignals.nullifierHash,
        await pc.salts(ASSET.ETH, RANGE.RANGE_100)
      ],
      unpackProof(proof.proof)
    )).eq(true)

    // on-chain verify
    await (await pc.verify(
      ASSET.ETH,
      RANGE.RANGE_100,
      proof.publicSignals.nullifierHash,
      proof.proof
    )).wait()

  });

  it("On-chain Verify Pomp Membership", async function () {
    // re-construct merkle tree offline
    const group = new Group(0, TREE_DEPTH, [sdk.identity.getCommitment()]) // group id --> root

    await sdk.verify(group)
  });

  it("Query zkSBT", async function () {
    expect(await sdk.query_sbt(ASSET.ETH, RANGE.RANGE_100)).eq(true)
  });

});

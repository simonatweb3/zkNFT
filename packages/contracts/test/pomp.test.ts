// browser non-compatible 
import { ethers } from "hardhat";
import * as fs from "fs";
import * as snarkjs from "snarkjs"
import { expect } from "chai";

// browser compatible 
import { Pomp, PompVerifier, PompVerifier__factory, Pomp__factory, PoseidonT3__factory, ZkSBT } from "../typechain-types";
import { ASSET, generateProof, hash, PompSdk, RANGE, TREE_DEPTH, unpackProof, claim_sbt_message, pomp2sbt, SBT } from "@pomp-eth/jssdk"
import * as circomlibjs from "circomlibjs"
import { Group } from "@semaphore-protocol/group"
import { dnld_aws, P0X_DIR } from "./utility";
import { resolve } from "path";

import { deployContracts } from "./fixtures/deployContracts";
import { Wallet } from "ethers";

import { deploy } from "./deploy";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { exit } from "process";


describe("Pomp", function () {
  this.timeout(6000000);
  let owner: SignerWithAddress;
  let signers: SignerWithAddress;
  let pc : Pomp
  let sdk : PompSdk
  let ownerOfZkSbtContract: Wallet;
  let zkSBT : ZkSBT

  before(async () => {
    signers = await ethers.getSigners()
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
    // deploy zkSBT contract
    const fixtures = await deployContracts(owner)
    zkSBT = fixtures.zkSBT

    pc = await deploy(owner, await zkSBT.address)

    // approve pomp to operate zkSBT
    await zkSBT.connect(owner).setOperator(pc.address,true)

  });

  it("Create Pomp SDK", async function () {
    sdk = await PompSdk.create(
      pc.address,
      owner,
      resolve(P0X_DIR, "./wasm/pomp.wasm"),
      resolve(P0X_DIR, "./zkey/pomp.zkey")
    )
  });


  // it("Add Asset", async function () {
  // });

  // it("Create Pomp Pool", async function () {
  // });


  let sbt : SBT = pomp2sbt(ASSET.ETH, RANGE.RANGE_100)
  let web2_certificate_signature
  it("Web2 Certificate", async function () {
    const claim_sbt_signature = await sdk.claim_sbt_signature(sbt)
    console.log("claim_sbt_signature : ", claim_sbt_signature)
	  expect(ethers.utils.verifyMessage(
      claim_sbt_message(sdk.identity.getCommitment().toString(), sbt),
      claim_sbt_signature
    )).eq(owner.address)

    
    web2_certificate_signature = await sdk.get_web2_certificate(sbt)
    console.log("web2_certificate_signature : ", web2_certificate_signature.signature)
    expect(web2_certificate_signature.eligible).eq(true)
  });

  it("Mint Pomp with certificate signature", async function () {
    await sdk.mint(ASSET.ETH, RANGE.RANGE_100,"1")
  });


  it("Query zkSBT", async function () {
    const sbts = await sdk.query_sbt_list()
    console.log("sbts : ", sbts)
    expect(sbts[0].asset).eq(sbt.asset)
    expect(sbts[0].range).eq(sbt.range)
  });

  let group : Group
  it("Off-chain re-construct merkle tree Group", async function () {
    const poolId = await pc.pools(sbt.asset, sbt.range)
    console.log("poolId : ", poolId)
    const onchain_root = await pc.getMerkleTreeRoot(poolId.id)

    group = (await sdk.reconstructOffchainGroup(sbt, onchain_root.toBigInt())).group
  });

  it("Get zkSBT Proof Key", async function () {
    const proof_key = await sdk.getLatestProofKey(sbt)
    console.log("proof_key : ", proof_key)
  });

  it("Off-chain Verify Pomp Membership", async function () {
    // 3/3. generate witness, prove, verify
    const proof =  await generateProof(
      sdk.identity,
      BigInt(await pc.salts(ASSET.ETH, RANGE.RANGE_100)),
      group,
      resolve(P0X_DIR, "./wasm/pomp.wasm"),
      resolve(P0X_DIR, "./zkey/pomp.zkey")
    )

    //console.log("proof : ", proof)

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
        BigInt(await pc.salts(ASSET.ETH, RANGE.RANGE_100))
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


});

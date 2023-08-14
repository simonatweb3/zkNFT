// browser non-compatible 
import { ethers } from "hardhat";
import * as fs from "fs";
import * as snarkjs from "snarkjs"
import { expect } from "chai";

// browser compatible 
import { Zksbt} from "../typechain-types";
import { ASSET, SBT_CATEGORY, generateProof, RANGE, TREE_DEPTH, unpackProof,  SBT, ZKSbtSDK, Backend, REVERT_REASON_ALREADY_MINT_SBT } from "@zksbt/jssdk"
import { Group } from "@semaphore-protocol/group"
import { dnld_aws, P0X_DIR } from "./utility";
import { resolve } from "path";

import { deployContracts } from "./fixtures/deployContracts";
import { Wallet } from "ethers";

import { deploy } from "./deploy";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { exit } from "process";
import { PoolStruct } from "../typechain-types/contracts/zkSBT.sol/Zksbt";


describe("Zksbt", function () {
  this.timeout(6000000);
  let owner: SignerWithAddress;
  let signers: SignerWithAddress;
  let pc : Zksbt
  let sdk : ZKSbtSDK
  let backend : Backend
  let ownerOfZkSbtContract: Wallet;
  let zkSBT : SBT

  before(async () => {
    signers = await ethers.getSigners()
    owner = signers[0];   // TODO : why not 10
    console.log("owner : ", owner.address)
    await Promise.all(
      [
        "wasm/zksbt.wasm",
        "zkey/zksbt.zkey",
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

    // approve to operate zkSBT
    await zkSBT.connect(owner).setOperator(pc.address,true)

  });

  it("Create Pomp SDK", async function () {
    sdk = await ZKSbtSDK.create(
      pc.address,
      owner,
      resolve(P0X_DIR, "./wasm/zksbt.wasm"),
      resolve(P0X_DIR, "./zkey/zksbt.zkey"),
    )

    backend = new Backend(
      pc.address,
      owner,
      resolve(P0X_DIR, "./wasm/zksbt.wasm"),
      resolve(P0X_DIR, "./zkey/zksbt.zkey"),
    );
  });

  // it("Add zkSBT(type, or pomp asset/range)", async function () {
  // });

  // it("Create More Pool for zkSBT, in case merkle tree full", async function () {
  //    // todo : merkle tree user case
  // });

  let sbt : SBT = SBT.createPomp(ASSET.ETH, RANGE.RANGE_100)
  let claim_sbt_signature : string
  it("Frontend Claim SBT Signature", async function () {
    claim_sbt_signature = await sdk.claimSbtSignature(sbt)
  });

  it("mint by backend ", async function () {
    await backend.mint(sdk.getPublicAddress(), sbt, claim_sbt_signature)
  });


  let backend_certificate :  {eligible: boolean; signature: string; sbt_id: bigint;}
  it("Frontend Ask Backend Certificate", async function () {
    backend_certificate = await backend.certificate(
      sdk.identity.getCommitment(),
      sbt,
      claim_sbt_signature
    );
    expect(backend_certificate.eligible).eq(true)
  });

  it("sbt using backend allocate new id", async function () {
    sbt.setId(backend_certificate.sbt_id)
  });

  it("duplicate mint zksbt directly with certificate signature", async function () {
    try {
      await sdk.mint(sbt, backend_certificate.signature)
    } catch (error) {
      expect(error.toString().includes(REVERT_REASON_ALREADY_MINT_SBT)).equal(true)
    }
  });

  it("Query zkSBT", async function () {
    const sbts = await sdk.querySbts()
    console.log("sbts : ", sbts)
    expect(sbts[0].category).eq(SBT_CATEGORY.POMP)
  });

  let pool : PoolStruct
  let onchain_root : bigint
  it("Get zkSBT Proof Key", async function () {
    pool = await pc.getSbtPool(sbt.category, sbt.attribute)
    onchain_root = (await pc.getMerkleTreeRoot(pool.id)).toBigInt()

    const salt = await backend.alloc_proof_key_salt(sbt)
    const proof = await sdk.generateProof(sbt, onchain_root, salt)
    
    const proof_key = await backend.generateProofKey(
      sdk.getPublicAddress(),
      sbt,
      salt,
      proof
    )
    console.log("proof_key : ", proof_key)
  });

if (false) {
  let group : Group
  it("Off-chain re-construct merkle tree Group", async function () {
    group = (await sdk.reconstructOffchainGroup(sbt, onchain_root)).group
  });

  it("Off-chain Verify Pomp Membership", async function () {
    // 3/3. generate witness, prove, verify
    const pool = await pc.getSbtPool(sbt.category, sbt.attribute)
    const proof =  await generateProof(
      sdk.identity,
      pool.salt.toBigInt(),
      group,
      resolve(P0X_DIR, "./wasm/zksbt.wasm"),
      resolve(P0X_DIR, "./zkey/zksbt.zkey")
    )

    //console.log("proof : ", proof)

    // off-chain verify proof
    const zkey_final = {
      type : "mem",
      data : new Uint8Array(Buffer.from(fs.readFileSync(resolve(P0X_DIR, "./zkey/zksbt.zkey"))))
    }
    const vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
    expect(await snarkjs.groth16.verify(
      vKey,
      [
        proof.publicSignals.merkleRoot,
        proof.publicSignals.nullifierHash,
        pool.salt.toBigInt()
      ],
      unpackProof(proof.proof)
    )).eq(true)

    // on-chain verify
    await (await pc.verify(
      sbt.normalize(),
      proof.publicSignals.nullifierHash,
      proof.proof
    )).wait()
  });

  // it("On-chain Verify Pomp Membership", async function () {
  //   console.log("sbt : ", sbt)
  //   await sdk.verify(sbt)
  // });

  let sbt_zkbab : SBT = SBT.create(SBT_CATEGORY.ZKBAB)
  it("add ZKBAB Pool", async function () {
    await (await pc.createSbtPool(sbt_zkbab.normalize(), "ZKBAB", 10)).wait()
  });

  it("mint sbt from backend", async function () {
    const res = await sdk.mintFromBackend(sbt_zkbab)
    console.log("mint res : ", res)
  });
}

});
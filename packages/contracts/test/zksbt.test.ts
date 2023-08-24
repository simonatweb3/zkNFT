// browser non-compatible 
import { ethers } from "hardhat";
import * as fs from "fs";
import * as snarkjs from "snarkjs"
import { expect } from "chai";

// browser compatible 
import { Sbt, Zksbt} from "../typechain-types";
import { SBT_CATEGORY, generateProof, TREE_DEPTH, unpackProof, ZKSbtSDK, Backend, REVERT_REASON_ALREADY_MINT_SBT, POMP_RANGE } from "@zksbt/jssdk"
import { Group } from "@semaphore-protocol/group"
import { dnld_aws, P0X_DIR } from "./utility";
import { resolve } from "path";
import { deployContracts } from "./fixtures/deployContracts";
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
  let zkSBT : Sbt

  before(async () => {
    signers = await ethers.getSigners()
    owner = signers[0];   // TODO : why not 10
    console.log("owner : ", owner.address)
    await Promise.all(
      [
        "wasm/zksbt.wasm",
        "zkey/zksbt.zkey",
        "wasm/identity.wasm",
        "zkey/identity.zkey",
      ].map(async (e) => {
        await dnld_aws(e);
      }),
    );

  });

  it("Deploy", async function () {
    // deploy zkSBT contract
    const fixtures = await deployContracts(owner)
    zkSBT = fixtures.zkSBT
    pc = await deploy(owner, await zkSBT.address, 1)

    // approve to operate zkSBT
    await zkSBT.connect(owner).setOperator(pc.address,true)
  });

  it("Create Pomp SDK", async function () {
    sdk = await ZKSbtSDK.create(
      owner,
      pc.address,
      resolve(P0X_DIR, "./wasm/zksbt.wasm"),
      resolve(P0X_DIR, "./zkey/zksbt.zkey"),
      resolve(P0X_DIR, "./wasm/identity.wasm"),
      resolve(P0X_DIR, "./zkey/identity.zkey"),
    )

    backend = new Backend(
      pc.address,
      owner,
      resolve(P0X_DIR, "./wasm/zksbt.wasm"),
      resolve(P0X_DIR, "./zkey/zksbt.zkey"),
    );

  });

  // it("Mint Sanity Test", async function () {

  //   const identity = [
  //     '3754797889652379466792370528161869808469561093460138447622645070292361441330',
  //     '3754797889652379466792370528161869808469561093460138447622645070292361441330'
  //   ]
  //   const category = [
  //     13,
  //     13
  //   ]
  //   const attribute = [
  //     1,
  //     1
  //   ]
  //   const ids = [
  //     '1692141368752422913',
  //     '1692142125571584001'
  //   ]
  //   const sigs = [
  //     '0xfa9da69ec2ff07929fb9fa6eee55e31cbbacedede0c65f7c771e8362c72cac3c1ead825209ec46a7b6f63f4389d23eb3d84a6ef791a6fab7bca0993d6ee1a7191b',
  //     '0x3314646e1c97aa46b670edf5b4e1cdb635545c6dd180c018439e899a031928d4563fddc5dcab0e8c93ba0da02bb18ef397f6c438af88c5da1a06c355cd4140051c'
  //   ]
  //   await (await pc.mint(
  //     identity,
  //     category,
  //     attribute,
  //     ids,
  //     sigs
  //   )).wait()
  // });

//if (false) {
  // it("Add zkSBT(type, or pomp asset/range)", async function () {
  // });

  // it("Create More Pool for zkSBT, in case merkle tree full", async function () {
  //    // todo : merkle tree user case
  // });

  let claim_sbt_signature : string
  let category = BigInt(SBT_CATEGORY.pompETH)
  let attribute = POMP_RANGE.RANGE_100
  it("Frontend Claim SBT Signature", async function () {
    claim_sbt_signature = await sdk.claimSbtSignature(category, attribute)
  });

  it("mint by backend more than gurantee", async function () {
    await backend.mint(sdk.getPublicAddress(), category, attribute, claim_sbt_signature)
    await backend.mint(sdk.getPublicAddress(), category, attribute, claim_sbt_signature)
    const groupId = await pc.sbt_group(category, attribute, sdk.getPublicAddress())
    
    await backend.mint(sdk.getPublicAddress(), category, attribute, claim_sbt_signature)
    let newGroupId = await pc.sbt_group(category, attribute, sdk.getPublicAddress())
    expect(groupId.add(1).toBigInt()).eq(newGroupId.toBigInt())
    await backend.mint(sdk.getPublicAddress(), category, attribute, claim_sbt_signature)
  
    await backend.mint(sdk.getPublicAddress(), category, attribute, claim_sbt_signature)
    newGroupId = await pc.sbt_group(category, attribute, sdk.getPublicAddress())
    expect(groupId.add(2).toBigInt()).eq(newGroupId.toBigInt())
  });

  let backend_certificate :  {eligible: boolean; signature: string; sbt_id: bigint;}
  it("Frontend Ask Backend Certificate", async function () {
    backend_certificate = await backend.certificate(
      sdk.identity.getCommitment(),
      category,
      attribute,
      claim_sbt_signature
    );
    expect(backend_certificate.eligible).eq(true)
  });

  it("duplicate mint zksbt directly with certificate signature", async function () {
    try {
      await sdk.mint(category, attribute, backend_certificate.sbt_id, backend_certificate.signature)
    } catch (error) {
      expect(error.toString().includes(REVERT_REASON_ALREADY_MINT_SBT)).equal(true)
    }
  });

  it("Query zkSBT", async function () {
    const sbts = await sdk.querySbt(category, attribute)
    console.log("sbts : ", sbts)
    //expect(sbts[0].category).eq(category)
  });

  let pool : PoolStruct
  let onchain_root : bigint
  it("Get zkSBT Proof Key", async function () {
    pool = await pc.getSbtPool(category, attribute)
    onchain_root = (await pc.getMerkleTreeRoot(pool.id)).toBigInt()

    const salt = await backend.alloc_proof_key_salt(category, attribute)
    const proof = await sdk.generateProof(salt)
    
    const proof_key = await backend.generateProofKey(
      sdk.getPublicAddress(),
      category,
      attribute,
      salt,
      proof
    )
    console.log("pomp proof_key : ", proof_key)
  });

  let zkbab_category = BigInt(SBT_CATEGORY.ZKBAB)
  let zkbab_attribute = ""

  it("add ZKBAB Pool", async function () {
    await (await pc.addSbt(zkbab_category, zkbab_attribute, "ZKBAB")).wait()
  });

  it("mint sbt and generate proof key without need generate proof", async function () {
    const salt = backend.init_salt()
    // const proof = await sdk.generateProof(zkbab_category, zkbab_attribute, onchain_root, salt)
    const res = await backend.mintAndGetProofKey(
      sdk.getPublicAddress(),
      zkbab_category,
      zkbab_attribute,
      await sdk.claimSbtSignature(zkbab_category, zkbab_attribute)
    )
    console.log("zkbab proof key : ", res.proof_key)
  });

if (false) {
  let group : Group
  it("Off-chain re-construct merkle tree Group", async function () {
    group = (await sdk.reconstructOffchainGroup(zkbab_category, zkbab_attribute, onchain_root)).group
  });

  it("Off-chain Verify Pomp Membership", async function () {
    // 3/3. generate witness, prove, verify
    const pool = await pc.getSbtPool(zkbab_category, zkbab_attribute)
    const proof =  await generateProof(
      sdk.identity,
      pool.salt.toBigInt(),
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
      zkbab_category,
      zkbab_attribute,
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
    await (await pc.addSbt(sbt_zkbab.normalize(), "ZKBAB", 10)).wait()
  });

  it("mint sbt from backend", async function () {
    const res = await sdk.mintFromBackend(sbt_zkbab)
    console.log("mint res : ", res)
  });
}

});
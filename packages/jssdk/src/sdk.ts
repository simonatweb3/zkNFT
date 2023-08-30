import {Contract, ethers, Signer} from "ethers"
import type {BigNumber} from 'ethers'

import { Identity } from "@semaphore-protocol/identity"
import { Group } from "@semaphore-protocol/group"
import { Proof } from "@semaphore-protocol/proof"
//import * as zksbtJson from "./ABI/Zksbt.json"
import zksbtJson from "./ABI/Zksbt.json"
import { generateProof } from "./proof"
import { FileType, ZKSBT_KEY_SIGN_MESSAGE, TREE_DEPTH, claim_msg, SBT_CATEGORY, POMP_RANGE, ZKSBT_CONTRACT_ADDR } from "./common"
import bigInt from 'big-integer';
import { generateIdentityProof, IdentityFullProof } from "./identity_proof"

interface eventSbtMinted {
  identity: BigNumber;
  category: BigNumber;
  attribute: string;
  id: BigNumber;
}

interface IZKSbt {
  getPublicAddress : () => bigint;
  claimSbtSignature : (category : bigint, attribute : string) => Promise<string>;
  mint : (category : bigint, attribute : string, id : bigint, verifyTimestamp:bigint, sig : string) => Promise<void>;
  generateProof : (category : bigint, attribute : string, root : bigint, salt : bigint) => Promise<IdentityFullProof>;
}

export class ZKSbtSDK implements IZKSbt {
  pc: Contract;
  signer: Signer;
  zksbt_wasm: FileType | undefined;
  zksbt_zkey: FileType | undefined;
  identity_wasm: FileType | undefined;
  identity_zkey: FileType | undefined;
  identity: Identity
  // on-chain merkle trees

  private constructor(
    zksbtContract: string,
    signer: Signer,
    identity: Identity
  ) {
    this.signer = signer;
    this.pc = new ethers.Contract(zksbtContract, zksbtJson.abi, signer);
    this.identity = identity
  }

  public static create = async (
    signer: Signer,
    zksbtContract: string = ZKSBT_CONTRACT_ADDR,
    zksbt_wasm: FileType = "https://p0x-labs.s3.amazonaws.com/zksbt/wasm/zksbt.wasm",
    zksbt_zkey: FileType = "https://p0x-labs.s3.amazonaws.com/zksbt/zkey/zksbt.zkey",
    identity_wasm: FileType = "https://p0x-labs.s3.amazonaws.com/zksbt/wasm/zksbt.wasm",
    identity_zkey: FileType = "https://p0x-labs.s3.amazonaws.com/zksbt/zkey/identity.zkey"
  ): Promise<ZKSbtSDK> => {
    const identity = ZKSbtSDK.generateIdentity(JSON.stringify(await ZKSbtSDK.generateAccountPrivKeys(signer)))
    const ctx = new ZKSbtSDK(zksbtContract, signer, identity);
    ctx.zksbt_wasm = zksbt_wasm
    ctx.zksbt_zkey = zksbt_zkey
    ctx.identity_wasm = identity_wasm
    ctx.identity_zkey = identity_zkey
    return ctx;
  };
  
  public static async generateAccountPrivKeys(signer : Signer) {
    const signature = await signer.signMessage(ZKSBT_KEY_SIGN_MESSAGE)
    const trapdoor = ethers.utils.hexlify('0x' + signature.slice(2, 34))
    const nullifier = ethers.utils.hexlify('0x' + signature.slice(34, 66))
    return { trapdoor, nullifier };
  }

  public static generateIdentity(keysJson : string) : Identity {
    return new Identity(keysJson)
  }

  public getPublicAddress() : bigint {
    return this.identity.getCommitment()
  }

  public async claimSbtSignature(
    category : bigint,
    attribute : string,
  ) : Promise<string> {
    const claim_sbt_signature =  await this.signer.signMessage(
      claim_msg(
        this.identity.getCommitment().toString(),
        category,
        attribute
      )
    );
    //console.log("claim_sbt_signature : ", claim_sbt_signature)
    return claim_sbt_signature
  }

  public async mint(
    category : bigint,
    attribute : string,
    id : bigint,
    verifyTimestamp : bigint,
    sig : string
  ) {
      return await (await this.pc.mint(
        [
          {
            category: category,
            attribute: attribute,
            publicAddress: this.identity.getCommitment(),
            id: id,
            verifyTimestamp: verifyTimestamp
          }
        ],
        [sig],
        {gasLimit : 20000000})
      ).wait()
  }

  public async estimate_mint_gas(
    category : bigint,
    attribute : string,
    id : bigint,
    verifyTimestamp : bigint,
    sig : string
  ) {
      return await this.pc.estimateGas.mint(
        [
          {
            category: category,
            attribute: attribute,
            publicAddress: this.identity.getCommitment(),
            id: id,
            verifyTimestamp: verifyTimestamp
          }
        ],
        [sig],
        {gasLimit : 30000000}
      )
  }


  public async generateProof(
    salt : bigint
  ) : Promise<IdentityFullProof> {
    const proof =  await generateIdentityProof(
      this.identity,
      salt,
      this.identity_wasm,
      this.identity_zkey
    )
    return proof
  }

  public async generateInGroupProof(
    category : bigint,
    attribute : string,
    root : bigint,
    salt : bigint
  ) : Promise<Proof> {
    const group = (await this.reconstructOffchainGroup(category, attribute, root)).group
    return this.generateSpecialProof(category, attribute, group, salt)
  }

  public async generateSpecialProof(
    category : bigint,
    attribute : string,
    group : Group,
    salt : bigint
  ) : Promise<Proof> {
    const proof =  await generateProof(
      this.identity,
      salt,
      group,
      this.zksbt_wasm,
      this.zksbt_zkey
    )
    return proof.proof
  }

  // constrcut off-chain merkle tree group with in-order on chain data,
  // util match the specific root
  public async reconstructOffchainGroup(
    category : bigint,
    attribute : string,
    root : bigint
  ) {
    const group = new Group(0, TREE_DEPTH, [])

    // query on-chain event list
    // TODO : using subgraph
    const eventName = "SbtMinted";
    const eventFilter = this.pc.filters[eventName]();
    const events = await this.pc.queryFilter(eventFilter);

    // add member to group, until root match
    for (let idx = 0; idx < events.length; idx++) {
      const e : eventSbtMinted = events[idx].args as unknown as eventSbtMinted;
      console.log("e : ", e)
      if (e[1].eq(category) && e[2] === attribute) {
        group.addMember(e[0])
        if(bigInt(group.root.toString()).eq(root)) {
          console.log("same root, merkle tree construct complete!")
          return {success : true, group : group}
        }
      }
    }

    // if not match root, return false
    return {success : true, group : group}
  }

  public async verify(
    category : bigint,
    attribute : string,
  ) {
    const pool = await this.pc.getSbtPool(category, attribute)
    const onchain_root = await this.pc.getMerkleTreeRoot(pool.id)
    const group = (await this.reconstructOffchainGroup(category, attribute, onchain_root.toBigInt())).group

    // generate ZKP
    const proof =  await generateProof(
      this.identity,
      pool.salt.toBigInt(),
      group,
      this.zksbt_wasm,
      this.zksbt_zkey
    )

    // on-chain verify
    await (await this.pc.verify(
      category,
      attribute,
      proof.publicSignals.nullifierHash,
      proof.proof
    )).wait()
  }

  // format long identity to UI-friendly style xxxx...xxxx
  // public async showIdentity(keysJson : string) {
  // }


  // zkSBT List
  public async querySbt(
    sbtId : bigint
  ) {
    // TODO : check SbtMinted event
    const sbtInfo = await this.pc.sbt_minted(sbtId)
    return sbtInfo
  }

}
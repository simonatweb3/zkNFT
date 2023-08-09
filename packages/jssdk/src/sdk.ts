import {Contract, ethers, Signer} from "ethers"
import type {BigNumber} from 'ethers'

import { Identity } from "@semaphore-protocol/identity"
import { Group } from "@semaphore-protocol/group"
//import * as zksbtJson from "./ABI/Zksbt.json"
import zksbtJson from "./ABI/Zksbt.json"
import { generateProof } from "./proof"
import { Backend } from "./backend"
import { ASSET, FileType, ZKSBT_KEY_SIGN_MESSAGE, RANGE, SBT, TREE_DEPTH } from "./common"
import bigInt from 'big-integer';

interface eventSbtMinted {
  identity: BigNumber;
  sbt: BigNumber;
}

interface IZKSbt {
  getPublicAddress() : bigint;
  check_eligible : (sbt : SBT) => Promise<boolean>;
  get_web2_certificate : (sbt : SBT) => Promise<{
    eligible: boolean;
    signature: string;
  }>;
  mint : (sbt : SBT, sbtId: string) => Promise<number>;
  mintCertificateZKSBT : (sbt : SBT, sig : string) => Promise<number>;
  getProofKey : (sbt : SBT) => Promise<string>;
}

export class ZKSbtSDK implements IZKSbt {
  pc: Contract;
  signer: Signer;
  zksbt_wasm: FileType | undefined;
  zksbt_zkey: FileType | undefined;
  identity: Identity
  // on-chain merkle trees


  // TODO : backend
  backend : Backend

  private constructor(
    zksbtContract: string,
    signer: Signer,
    identity: Identity,
    backend: Backend
  ) {
    this.signer = signer;
    this.pc = new ethers.Contract(zksbtContract, zksbtJson.abi, signer);
    this.identity = identity

    this.backend = backend
  }

  public static create = async (
    zksbtContract: string,
    signer: Signer,
    zksbt_wasm: FileType,
    zksbt_zkey: FileType,
  ): Promise<ZKSbtSDK> => {
    const identity = ZKSbtSDK.generateIdentity(JSON.stringify(await ZKSbtSDK.generateAccountPrivKeys(signer)))
    const backend = new Backend(zksbtContract, signer, zksbt_wasm, zksbt_zkey);
    const ctx = new ZKSbtSDK(zksbtContract, signer, identity, backend);
    ctx.zksbt_wasm = zksbt_wasm
    ctx.zksbt_zkey = zksbt_zkey
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

  public async check_eligible(
    sbt : SBT
  ) : Promise<boolean> {
    return this.backend.check_eligible(await this.signer.getAddress(), sbt);
  }

  public async claim_sbt_signature(
    sbt : SBT
  ) {
    const claim_sbt_signature =  await this.signer.signMessage(
      sbt.claim_msg(
        this.identity.getCommitment().toString()
      )
    );
    console.log("claim_sbt_signature : ", claim_sbt_signature)
    return claim_sbt_signature
  }

  public async get_web2_certificate(
    sbt : SBT
  ) {
    const claim_sbt_signature = await this.claim_sbt_signature(sbt)

    return this.backend.certificate(
      this.identity.getCommitment(),
      sbt,
      claim_sbt_signature
    );
  }

  public async mintCertificateZKSBT(
    sbt : SBT,
    sig : string
  ) {
    return await (await this.pc.mint(
      [this.identity.getCommitment()],
      [sbt.normalize()],
      [sig],
      {gasLimit : 2000000})
    ).wait()
  }

  public async mint(
    sbt : SBT
  ) {
    const certificate = await this.get_web2_certificate(sbt)
    sbt.setId(certificate.sbt_id)
    return await this.mintCertificateZKSBT(sbt, certificate.signature)
  }

  public async mintFromBackend(
    sbt : SBT
  ) {
    const claim_sbt_signature = await this.claim_sbt_signature(sbt)
    return await this.backend.mint(
      this.identity.getCommitment(),
      sbt,
      claim_sbt_signature
    )
  }

  public async getProofKey(
    sbt : SBT
  ) : Promise<string> {
    const pool = await this.pc.getSbtPool(sbt.category, sbt.attribute)
    const onchain_root = await this.pc.getMerkleTreeRoot(pool.id)
    const group = (await this.reconstructOffchainGroup(sbt, onchain_root.toBigInt())).group
    return this.getSpecialProofKey(group, sbt)
  }

  public async getSpecialProofKey(
    group : Group,
    sbt : SBT
  ) : Promise<string> {
    const pool = await this.pc.getSbtPool(sbt.category, sbt.attribute)
    const proof =  await generateProof(
      this.identity,
      BigInt(pool.salt),
      group,
      this.zksbt_wasm,
      this.zksbt_zkey
    )

    return this.backend.generate_proof_key(
      this.identity.getCommitment(),
      sbt,
      pool.salt,
      proof.proof
    )
  }

  public async mint_and_generate_proof_key() {
    // mint
    // return getProofKey
  }

  // constrcut off-chain merkle tree group with in-order on chain data,
  // util match the specific root
  public async reconstructOffchainGroup(
    sbt : SBT,
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
      //console.log("e : ", e)
      if (SBT.getMetaData(e[1]).eq(sbt.metaData())) {
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
    sbt : SBT
  ) {
    const pool = await this.pc.getSbtPool(sbt.category, sbt.attribute)
    const onchain_root = await this.pc.getMerkleTreeRoot(pool.id)
    const group = (await this.reconstructOffchainGroup(sbt, onchain_root.toBigInt())).group

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
      sbt.normalize(),
      proof.publicSignals.nullifierHash,
      proof.proof
    )).wait()
  }

  // format long identity to UI-friendly style xxxx...xxxx
  // public async showIdentity(keysJson : string) {
  // }


  // zkSBT List
  public async query_sbt(
    sbt : SBT
  ) {
    // TODO : check SbtMinted event
    const id = await this.pc.sbt_minted(sbt.metaData(), this.identity.getCommitment())
    return id
  }

  public async query_sbt_list() {
    const sbt_list: SBT[] = []
    for(const asset in Object.values(ASSET)) {  // TODO : fix
      for(const range in Object.values(RANGE)) {
        //console.log("asset ", asset, " range ", range)
        const sbt:SBT = SBT.createPomp(Number(asset), Number(range))
        const sbt_id = await this.query_sbt(sbt)
        if (sbt_id > 0) {
          sbt.setId(sbt_id)
          sbt_list.push(sbt)
        }
      }
    }
    return sbt_list
  }

}
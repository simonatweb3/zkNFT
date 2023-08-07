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
  get_web2_certificate : (sbt : SBT) => Promise<{
    eligible: boolean;
    signature: string;
  }>;
  mint : (sbt : SBT, sbtId: string) => Promise<number>;
  mintCertificateZKSBT : (sbt : SBT, sbtId: bigint, sig : string) => Promise<number>;
  getLatestProofKey : (sbt : SBT) => Promise<string>;
  getProofKey : (group : Group, sbt : SBT) => Promise<string>;
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
    identity: Identity
  ) {
    this.signer = signer;
    this.pc = new ethers.Contract(zksbtContract, zksbtJson.abi, signer);
    this.identity = identity

    this.backend = new Backend(signer);
  }

  public static create = async (
    zksbtContract: string,
    signer: Signer,
    zksbt_wasm: FileType,
    zksbt_zkey: FileType,
  ): Promise<ZKSbtSDK> => {
    const identity = ZKSbtSDK.generateIdentity(JSON.stringify(await ZKSbtSDK.generateAccountPrivKeys(signer)))
    const ctx = new ZKSbtSDK(zksbtContract, signer, identity);
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

  public is_eligible(
    sbt : SBT
  ) : boolean {
    return this.backend.is_eligible(sbt);
  }

  public async claim_sbt_signature(
    sbt : SBT
  ) {
    const claim_sbt_signature =  await this.signer.signMessage(
      sbt.claim_msg(
        this.identity.getCommitment().toString()
      )
    );
    console.log("user claim_sbt_signature : ", claim_sbt_signature)
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
    // TODO : allocate sbt_id ?
  }

  public async mintCertificateZKSBT(
    sbt : SBT,
    sbtId : bigint,
    sig : string
  ) {
    console.log("mint zksbt for category ", sbt.category, " attribute ", sbt.attribute, " sbtId ", sbtId)
    return await (await this.pc.mint(
      [this.identity.getCommitment()],
      [sbt.normalize()],
      [sig],
      {gasLimit : 2000000})
    ).wait()
  }

  // mint(user tx / server tx) a sbt on-chain (sbt[asset_id] = identity), generate a proof key for backend. 
  public async mint(
    sbt : SBT
  ) {
    const certificate = await this.get_web2_certificate(sbt)
    sbt.setId(certificate.sbt_id)
    return await this.mintCertificateZKSBT(sbt, certificate.sbt_id, certificate.signature)
  }

  public async getLatestProofKey(
    sbt : SBT
  ) : Promise<string> {
    const pool = await this.pc.getSbtPool(sbt.category, sbt.attribute)
    const onchain_root = await this.pc.getMerkleTreeRoot(pool.id)
    const group = (await this.reconstructOffchainGroup(sbt, onchain_root.toBigInt())).group
    return this.getProofKey(group, sbt)
  }

  public async getProofKey(
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

    const bytesData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[8]"],
      [proof.proof]
    );

    // signature zkp proof --> proof key

    return ethers.utils.keccak256(bytesData); 
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
    group : Group
  ) {
    // TODO : reconstruct off-chain merkle tree, subgraph

    // generate ZKP
    const proof =  await generateProof(
      this.identity,
      BigInt(await this.pc.salts(ASSET.ETH, RANGE.RANGE_100)),
      group,
      this.zksbt_wasm,
      this.zksbt_zkey
    )

    // on-chain verify
    await (await this.pc.verify(
      ASSET.ETH,
      RANGE.RANGE_100,
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
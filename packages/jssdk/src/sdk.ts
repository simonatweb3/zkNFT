import {Contract, ethers, Signer} from "ethers"
import { Identity } from "@semaphore-protocol/identity"
import { Group } from "@semaphore-protocol/group"
//import * as pompJson from "./ABI/Pomp.json"
import pompJson from "./ABI/Pomp.json"
import { generateProof } from "./proof"
import { PompBackend } from "./backend"
import { ASSET, claim_sbt_message, FileType, pomp2sbt, POMP_CLAIM_MESSAGE, POMP_KEY_SIGN_MESSAGE, RANGE, SBT } from "./common"

interface IPomp {
  getPublicAddress() : bigint;
  mint: (asset: number, range: number, sbtId: string) => Promise<number>;
  getProofKey : (group : Group, asset : number, range : number) => Promise<string>;
}

export class PompSdk implements IPomp {
  pc: Contract;
  signer: Signer;
  pomp_wasm: FileType | undefined;
  pomp_zkey: FileType | undefined;
  identity: Identity
  // on-chain merkle trees


  // TODO : backend
  backend : PompBackend

  private constructor(
    pompContract: string,
    signer: Signer,
    identity: Identity
  ) {
    this.signer = signer;
    this.pc = new ethers.Contract(pompContract, pompJson.abi, signer);
    this.identity = identity

    this.backend = new PompBackend(signer);
  }

  public static create = async (
    pompContract: string,
    signer: Signer,
    pomp_wasm: FileType,
    pomp_zkey: FileType,
  ): Promise<PompSdk> => {
    const identity = PompSdk.generateIdentity(JSON.stringify(await PompSdk.generateAccountPrivKeys(signer)))
    const ctx = new PompSdk(pompContract, signer, identity);
    ctx.pomp_wasm = pomp_wasm
    ctx.pomp_zkey = pomp_zkey
    return ctx;
  };
  
  public static async generateAccountPrivKeys(signer : Signer) {
    const signature = await signer.signMessage(POMP_KEY_SIGN_MESSAGE)
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
    return await this.signer.signMessage(
      claim_sbt_message(
        this.identity.getCommitment().toString(), sbt
      )
    );
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

  // mint(user tx / server tx) a sbt on-chain (sbt[asset_id] = identity), generate a proof key for backend. 
  public async mint(asset : ASSET, range : RANGE, sbtId : string) {
    console.log("mint pomp for asset ", asset, " range ", range, " sbtId ", sbtId)

    return await (await this.pc.mint([this.identity.getCommitment()], asset, range, sbtId, {gasLimit : 1000000})).wait()
  }

  public async getProofKey(
    group : Group,
    asset : number,
    range : number
  ) : Promise<string> {
    const proof =  await generateProof(
      this.identity,
      BigInt(await this.pc.salts(asset,range)),
      group,
      this.pomp_wasm,
      this.pomp_zkey
    )

    const bytesData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[8]"],
      [proof.proof]
    );
    
    return ethers.utils.keccak256(bytesData); 
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
      this.pomp_wasm,
      this.pomp_zkey
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
    return await this.pc.sbt_minted(sbt.asset, sbt.range, this.identity.getCommitment())
  }

  public async query_sbt_list() {
    let sbt_list: SBT[] = []
    for(const asset in Object.values(ASSET)) {  // TODO : fix
      for(const range in Object.values(RANGE)) {
        //console.log("asset ", asset, " range ", range)
        const sbt:SBT = pomp2sbt(Number(asset), Number(range))
        if (await this.query_sbt(sbt)) {
          sbt_list.push(sbt)
        }
      }
    }
    return sbt_list
  }

}
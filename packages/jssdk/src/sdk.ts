import {Contract, ethers, Signer} from "ethers"
import { Identity } from "@semaphore-protocol/identity"
import { Group } from "@semaphore-protocol/group"
//import * as pompJson from "./ABI/Pomp.json"
import pompJson from "./ABI/Pomp.json"
import { generateProof } from "./proof"

export type FileType = any;
export const POMP_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";
export const TREE_DEPTH = 10

export enum ASSET {
  ETH,
  BNB
  // upgradeable
}

export enum RANGE {
    RANGE_0,       // >0, ignore?
    RANGE_1_10,    // 1~10
    RANGE_10_100,  // 10~100
    RANGE_100      // >100
}

interface IPomp {
  mint: (asset: number, range: number, sbtId: string) => Promise<number>;
  // allocate_asset_id
}

export class PompSdk implements IPomp {
  pc: Contract;
  signer: Signer;
  pomp_wasm: FileType | undefined;
  pomp_zkey: FileType | undefined;
  identity: Identity
  // on-chain merkle trees

  private constructor(
    pompContract: string,
    signer: Signer,
    identity: Identity
  ) {
    this.signer = signer;
    this.pc = new ethers.Contract(pompContract, pompJson.abi, signer);
    this.identity = identity
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
    const trapdoor = ethers.hexlify('0x' + signature.slice(2, 34))
    const nullifier = ethers.hexlify('0x' + signature.slice(34, 66))
    return { trapdoor, nullifier };
  }

  public static generateIdentity(keysJson : string) : Identity {
    return new Identity(keysJson)
  }

  // web2 interface :  get the allocated asset_id from backend/on-chain contract
  public allocate_asset_id() : bigint {
    return BigInt(5678); // TODO
  }

  // mint(user tx / server tx) a sbt on-chain (sbt[asset_id] = identity), generate a proof key for backend. 
  public async mint(asset : ASSET, range : RANGE, sbtId : string) {
    console.log("mint pomp for asset ", asset, " range ", range, " sbtId ", sbtId)

    return await (await this.pc.mint([this.identity.getCommitment()], asset, range, sbtId)).wait()
  }

  public async verify(
    group : Group
  ) {
    // TODO : reconstruct off-chain merkle tree, subgraph

    // generate ZKP
    const proof =  await generateProof(
      this.identity,
      await this.pc.salts(ASSET.ETH, RANGE.RANGE_100),
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
    asset : number,
    range : number
  ) {
    // check SbtMinted event
    return await this.pc.sbt_minted(asset, range, this.identity.getCommitment())
  }

}
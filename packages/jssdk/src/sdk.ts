import {Contract, ethers, Signer} from "ethers"
import { Identity } from "@semaphore-protocol/identity"
import { poseidon2 } from "poseidon-lite"
import * as pompJson from "./ABI/Pomp.json"

export type FileType = any;
export const POMP_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";
export const TREE_DEPTH = 10

export class PompIdentity {
  private semaphore_identity : Identity
  private sbt_id : number
  private _commitment: bigint

  constructor(keysJson : string, sbtId : number) {
    this.semaphore_identity = new Identity(keysJson)
    this.sbt_id = sbtId
    this._commitment = poseidon2([this.semaphore_identity.getCommitment(), this.sbt_id])
  }

  /**
   * Returns the identity trapdoor.
   * @returns The identity trapdoor.
   */
  public getTrapdoor(): bigint {
    return this.semaphore_identity.getTrapdoor()
  }

  /**
   * Returns the identity nullifier.
   * @returns The identity nullifier.
   */
  public getNullifier(): bigint {
    return this.semaphore_identity.getNullifier()
  }

  public getCommitment(): bigint {
    return this._commitment
  }

  toString() : string {
    return `PompIdentity { semaphore_identity : ${this.semaphore_identity.toString()}, sbt_id: ${this.sbt_id} }`;
  }
}

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
  // mint: (assetId: number) => Promise<number>;
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

  // get the allocated asset_id from backend/on-chain contract
  public allocate_asset_id() : bigint {
    return BigInt(5678); // TODO
  }

  public per_sbt_commitment(
    sbt_id : bigint
  ): bigint {
    return poseidon2([this.identity.getCommitment(), sbt_id])
  }

  // mint(user tx / server tx) a sbt on-chain (sbt[asset_id] = identity), generate a proof key for backend. 
  public async mint(asset : ASSET, range : RANGE) {
    console.log("mint pomp for asset ", asset, " range ", range)

    const sbt_id = this.allocate_asset_id()
    return await (await this.pc.mint([this.per_sbt_commitment(sbt_id)], asset, range)).wait()
    //return await (await this.pc.mint([this.identity.getCommitment()], asset, range)).wait()
  }

  public verify() {
    // reconstruct off-chain merkle tree

    // generate ZKP
  }

  // generate proof.

  //

  // format long identity to UI-friendly style xxxx...xxxx
  // public async showIdentity(keysJson : string) {
  // }

}
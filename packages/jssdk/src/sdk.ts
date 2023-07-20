import {Contract, ethers, Signer} from "ethers"
import { Identity } from "@semaphore-protocol/identity"
import { poseidon2 } from "poseidon-lite"
import pompJson from "./ABI/Pomp.json" assert { type: "json" }

export type FileType = any;
export const POMP_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";

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

interface IPomp {
  // mint: (assetId: number) => Promise<number>;
  // allocate_asset_id
}

export class PompSdk implements IPomp {
  pc: Contract;
  signer: Signer;
  pomp_wasm: FileType | undefined;
  pomp_zkey: FileType | undefined;

  private constructor(pompContract: string, signer: Signer) {
    this.signer = signer;
    this.pc = new ethers.Contract(pompContract, pompJson.abi, signer);
  }

  public static create = async (
    pompContract: string,
    signer: Signer,
    pomp_wasm: FileType,
    pomp_zkey: FileType,
  ): Promise<PompSdk> => {
    const ctx = new PompSdk(pompContract, signer);
    ctx.pomp_wasm = pomp_wasm
    ctx.pomp_zkey = pomp_zkey
    return ctx;
  };
  
  public async generateAccountPrivKeys(signer : Signer) {
    const signature = await signer.signMessage(POMP_KEY_SIGN_MESSAGE)
    const trapdoor = ethers.utils.hexlify('0x' + signature.slice(2, 34))
    const nullifier = ethers.utils.hexlify('0x' + signature.slice(34, 66))
    return { trapdoor, nullifier };
  }

  public generateIdentity(keysJson : string) : bigint {
    const identity = new Identity(keysJson)
    const identityCommitment = identity.getCommitment()
    return identityCommitment;
  }

  // get the allocated asset_id from backend/on-chain contract
  public allocate_asset_id() {

  }

  // mint(user tx / server tx) a sbt on-chain (sbt[asset_id] = identity), generate a proof key for backend. 
  public mint() {

  }

  public verify() {

  }

  // generate proof.

  //

  // format long identity to UI-friendly style xxxx...xxxx
  // public async showIdentity(keysJson : string) {
  // }

}
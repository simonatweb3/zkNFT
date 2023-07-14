import {ethers, Signer} from "ethers"
import { Identity } from "@semaphore-protocol/identity"
import { poseidon2 } from "poseidon-lite"

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

export class PompSdk {
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

  // format long identity to UI-friendly style xxxx...xxxx
  // public async showIdentity(keysJson : string) {
  // }

}
import {ethers, Signer} from "ethers"
import { Identity } from "@semaphore-protocol/identity"

export const POMP_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";

export class PompSdk {
  public async generateAccountPrivKeys(signer : Signer) {
    const signature = await signer.signMessage(POMP_KEY_SIGN_MESSAGE)
    const trapdoor = ethers.utils.hexlify('0x' + signature.slice(2, 34))
    const nullifier = ethers.utils.hexlify('0x' + signature.slice(34, 66))
    return { trapdoor, nullifier };
  }

  public async generateIdentity(keysJson : string) {
    const identity = new Identity(keysJson)
    const identityCommitment = identity.getCommitment()
    return identityCommitment
  }

  // format long identity to UI-friendly style xxxx...xxxx
  // public async showIdentity(keysJson : string) {
  // }

}
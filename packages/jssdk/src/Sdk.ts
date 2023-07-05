import {ethers, Signer} from "ethers"

export const POMP_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";

export class PompSdk {
  public async generateAccountPrivKeys(signer : Signer) {
    console.log('Balance:', ethers.utils.formatEther(650000000));
    const signature = await signer.signMessage(POMP_KEY_SIGN_MESSAGE)
    const trapdoor = ethers.utils.hexlify('0x' + signature.slice(2, 34))
    const nullifier = ethers.utils.hexlify('0x' + signature.slice(34, 66))
    return { trapdoor, nullifier };
  }
}
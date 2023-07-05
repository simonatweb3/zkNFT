import {ethers, Signer} from "ethers"

export const POMP_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";

export class PompSdk {
  public async getAccountKeySigningData(signer : Signer) {
    console.log('Balance:', ethers.utils.formatEther(650000000));
    //return signer.signMessage(Buffer.from(POMP_KEY_SIGN_MESSAGE))
    return signer.signMessage(POMP_KEY_SIGN_MESSAGE)
  }

  // public async generateAccountKeyPair(account: EthAddress, provider = this.provider) {
  //   const ethSigner = new Web3Signer(provider);
  //   const signingData = this.getAccountKeySigningData();
  //   const signature = await ethSigner.signPersonalMessage(signingData, account);
  //   const privateKey = signature.slice(0, 32);
  //   const publicKey = await this.derivePublicKey(privateKey);
  //   return { publicKey, privateKey };
  // }
}
import {ethers} from "ethers"

const POMP_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";

export class PompSdk {
  public getAccountKeySigningData() {
    //return Buffer.from(POMP_KEY_SIGN_MESSAGE);
    return POMP_KEY_SIGN_MESSAGE;
  }
}

async function test() {
  const sdk = new PompSdk();
    console.log(sdk.getAccountKeySigningData());


	  //let signature = await userAdmin.signMessage(msg)
	  //expect(ethers.utils.verifyMessage(msg, signature)).equal(userAdmin.address)
}

//abc

test();

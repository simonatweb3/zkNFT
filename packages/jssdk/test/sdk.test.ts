//import {PompSdk} from "@pomp-eth/jssdk/src/Sdk"
import { PompSdk, POMP_KEY_SIGN_MESSAGE } from "../src/sdk.js"
import { ethers, Signer, Wallet } from "ethers";
import { expect } from "chai";

describe("POMP-ETH SDK Unit Test", function () {

  let signer: Signer
  let sdk : PompSdk
  before(async () => {
    sdk = new PompSdk();
    const PRIV_KEY = "0x828a065aa2818619cb9a5435ce9e7d95fdd3e6dd89fc5fcd4dd4a37346a54084" // 0x7A7765Db4733DFe037342A8bCDfAEE83ddE405da
    signer = new Wallet(PRIV_KEY, ethers.getDefaultProvider())
  });

  it("Account Derive", async () => {
    let signature = await sdk.getAccountKeySigningData(signer)
    console.log("user signature : ", signature);
	  expect(ethers.utils.verifyMessage(POMP_KEY_SIGN_MESSAGE, signature)).equal(await signer.getAddress())
  });

});

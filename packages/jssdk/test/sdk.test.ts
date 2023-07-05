//import {PompSdk} from "@pomp-eth/jssdk/src/Sdk"
import { PompSdk, POMP_KEY_SIGN_MESSAGE } from "../src/sdk.js"
import { ethers, Signer, Wallet } from "ethers";
import { expect } from "chai";

async function test() {
  const sdk = new PompSdk();

    const PRIV_KEY = "0x828a065aa2818619cb9a5435ce9e7d95fdd3e6dd89fc5fcd4dd4a37346a54084" // 0x7A7765Db4733DFe037342A8bCDfAEE83ddE405da
    let signer : Signer = new Wallet(PRIV_KEY, ethers.getDefaultProvider())
    let signature = await sdk.getAccountKeySigningData(signer)
    console.log("user signature : ", signature);

	  expect(ethers.utils.verifyMessage(POMP_KEY_SIGN_MESSAGE, signature)).equal(await signer.getAddress())
}

//abc

test();

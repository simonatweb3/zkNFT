//import {PompSdk} from "@pomp-eth/jssdk/src/Sdk"
//import { expect } from "chai";
import { PompSdk } from "../src/jssdk.js"
//import {PompSdk} from "../src/index"
import { ethers, Signer, Wallet } from "ethers";

async function test() {
  const sdk = new PompSdk();

    const PRIV_KEY = "0x828a065aa2818619cb9a5435ce9e7d95fdd3e6dd89fc5fcd4dd4a37346a54084" // 0x7A7765Db4733DFe037342A8bCDfAEE83ddE405da
    let signer : Signer = new Wallet(PRIV_KEY, ethers.getDefaultProvider())
    let keys = await sdk.generateAccountPrivKeys(signer)
    console.log("keys : ", keys);

    let id = await sdk.generateIdentity(JSON.stringify(keys))
    console.log("id : ", id);

	  //expect(ethers.utils.verifyMessage(POMP_KEY_SIGN_MESSAGE, signature)).equal(await signer.getAddress())
}

//abc

test();

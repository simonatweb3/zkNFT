//import {PompSdk} from "@pomp-eth/jssdk/src/Sdk"
import { PompSdk } from "../src/sdk.js"
import { ethers, Signer, Wallet } from "ethers";

async function test() {
  const sdk = new PompSdk();

    const PRIV_KEY = "0x828a065aa2818619cb9a5435ce9e7d95fdd3e6dd89fc5fcd4dd4a37346a54084" // 0x7A7765Db4733DFe037342A8bCDfAEE83ddE405da
    let signer : Signer = new Wallet(PRIV_KEY, ethers.getDefaultProvider())
    console.log("sign data : ", await sdk.getAccountKeySigningData(signer));

	  //let signature = await userAdmin.signMessage(msg)
	  //expect(ethers.utils.verifyMessage(msg, signature)).equal(userAdmin.address)
}

//abc

test();

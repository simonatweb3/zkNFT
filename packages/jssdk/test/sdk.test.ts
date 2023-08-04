import { ZKSbtSDK } from "../src/sdk"
import { Signer, Wallet } from "ethers";

async function test() {
  const PRIV_KEY = "0x828a065aa2818619cb9a5435ce9e7d95fdd3e6dd89fc5fcd4dd4a37346a54084" // 0x7A7765Db4733DFe037342A8bCDfAEE83ddE405da
  const signer : Signer = new Wallet(PRIV_KEY)

  const sdk = await ZKSbtSDK.create(
    "0x0",
    signer, 
    "https://p0x-labs.s3.amazonaws.com/zksbt/wasm/zksbt.wasm",
    "https://p0x-labs.s3.amazonaws.com/zksbt/zkey/zksbt.zkey"
  );  // TODO

  console.log("sdk : ", sdk)

  const keys = await ZKSbtSDK.generateAccountPrivKeys(signer)
  console.log("keys : ", keys);

  const id = await ZKSbtSDK.generateIdentity(JSON.stringify(keys))
  console.log("id : ", id);
}

//abc

test();

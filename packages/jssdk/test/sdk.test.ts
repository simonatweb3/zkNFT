import { ZKSbt } from "../src/sdk"
import { Signer, Wallet } from "ethers";

async function test() {
  const PRIV_KEY = "0x828a065aa2818619cb9a5435ce9e7d95fdd3e6dd89fc5fcd4dd4a37346a54084" // 0x7A7765Db4733DFe037342A8bCDfAEE83ddE405da
  const signer : Signer = new Wallet(PRIV_KEY)

  const sdk = await PompSdk.create(
    "0x0",
    signer, 
    "https://p0x-labs.s3.amazonaws.com/pomp/wasm/pomp.wasm",
    "https://p0x-labs.s3.amazonaws.com/pomp/zkey/pomp.zkey"
  );  // TODO

  console.log("sdk : ", sdk)

  const keys = await PompSdk.generateAccountPrivKeys(signer)
  console.log("keys : ", keys);

  const id = await PompSdk.generateIdentity(JSON.stringify(keys))
  console.log("id : ", id);

  //expect(ethers.utils.verifyMessage(POMP_KEY_SIGN_MESSAGE, signature)).equal(await signer.getAddress())
}

//abc

test();

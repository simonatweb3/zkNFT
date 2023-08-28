// browser non-compatible 
import { ethers } from "hardhat";

// browser compatible 
import { Zksbt, Zksbt__factory} from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { certi_msg } from "@zksbt/jssdk";
import { deploy } from "./deploy";
import { deployContracts } from "./fixtures/deployContracts";
const hre = require('hardhat');


describe("Zksbt", function () {
  this.timeout(6000000);
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let signers: SignerWithAddress;
  let pc : Zksbt

  before(async () => {
    signers = await ethers.getSigners()
    owner = signers[0];   // TODO : why not 10
    user = signers[1];   // TODO : why not 10
    console.log("owner : ", owner.address)
    console.log("user : ", user.address)

  });

if (true) {
  it("Tx to Testnet for addSbt", async function () {
		if (hre.hardhatArguments.network == undefined) {
      const fixtures = await deployContracts(owner)
      const zkSBT = fixtures.zkSBT
      pc = await deploy(owner, await zkSBT.address, 1)
    } else {
      pc = Zksbt__factory.connect(process.env.ZKSBT, owner)
    }
    await (await pc.addSbt(12, "0.1", "pompETH-0_1")).wait()
    await (await pc.addSbt(12, "1", "pompETH-1")).wait()
    await (await pc.addSbt(12, "10", "pompETH-10")).wait()
    await (await pc.addSbt(12, "500", "pompETH-500")).wait()
    
    await (await pc.addSbt(13, "1", "pompBNB-1")).wait()
    await (await pc.addSbt(13, "10", "pompBNB-10")).wait()
    await (await pc.addSbt(13, "1000", "pompBNB-1000")).wait()
    await (await pc.addSbt(13, "10000", "pompBNB-10000")).wait()
    await (await pc.addSbt(13, "50000", "pompBNB-50000")).wait()
  });
}


if (false) {
  it("Tx to Testnet for mint", async function () {
		if (hre.hardhatArguments.network == undefined) {
      const fixtures = await deployContracts(owner)
      const zkSBT = fixtures.zkSBT
      pc = await deploy(owner, await zkSBT.address, 1)
    } else {
      pc = Zksbt__factory.connect(process.env.ZKSBT, owner)
    }
    // await (await pc.addSbt(2, 0, "ZKKYC")).wait()

    const publicAddress = "2139812740077698330243443173425288132836311448173875033127158164541564470394"
    const category = BigInt(100)
    const attribute = ""
    const sbt_id = BigInt("68063175924252671")
    const msg = certi_msg(
        publicAddress,
        category,
        attribute,
        sbt_id
      )

    const sig = await owner.signMessage(msg);
    console.log("msg : ", msg)
    console.log("certificate_signature : ", sig)

    const user_zksbt : Zksbt = Zksbt__factory.connect(pc.address, user)
    await (await user_zksbt.mint(
      [publicAddress],
      [category],
      [attribute],
      [sbt_id],
      [sig]
    )).wait()

  });
}

});
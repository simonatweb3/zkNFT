// browser non-compatible 
import { ethers } from "hardhat";

// browser compatible 
import { Zksbt, Zksbt__factory} from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


describe("Zksbt", function () {
  this.timeout(6000000);
  let owner: SignerWithAddress;
  let signers: SignerWithAddress;
  let pc : Zksbt

  before(async () => {
    signers = await ethers.getSigners()
    owner = signers[0];   // TODO : why not 10
    console.log("owner : ", owner.address)

  });

  it("Tx to Testnet for add Sbt", async function () {
    pc = Zksbt__factory.connect(process.env.ZKSBT, owner)
    await (await pc.addSbt(2, 0, "ZKKYC")).wait()
  });

});
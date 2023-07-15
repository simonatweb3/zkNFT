import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { Pomp, Pomp__factory } from "../typechain-types";

describe("Pomp", function () {
  let owner: SignerWithAddress;
  let signers: SignerWithAddress[];
  let pc : Pomp
  before(async () => {
    signers = await ethers.getSigners();
    owner = signers[10];
  });

  it("Deploy", async function () {
    pc = await new Pomp__factory(owner).deploy()
    console.log("pomp contract : ", await pc.getAddress())
  });

  // it("Create Pomp Pool", async function () {
  // });

  // it("Mint Pomp", async function () {
  // });

  // it("Verify Pomp Membership", async function () {
  // });
});

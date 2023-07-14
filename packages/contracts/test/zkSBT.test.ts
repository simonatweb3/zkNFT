import { Wallet } from "ethers";
import { deployContracts } from "./fixtures/deployContracts";
import { Pomp, ZkSBT } from "../typechain-types";
import crypto from "crypto";
import { expect } from "chai";

describe("ZkSBT basic test", async function () {
  let ownerOfPompContract: Wallet;
  let ownerOfZkSbtContract: Wallet;
  let operatorOfZkSbtContract: Wallet;
  let user_1: Wallet;
  let pomp: Pomp;
  let zkSBT: ZkSBT;

  before(async () => {
    ({
      ownerOfPompContract,
      ownerOfZkSbtContract,
      operatorOfZkSbtContract,
      user_1,
      pomp,
      zkSBT,
    } = await deployContracts());
  });

  describe("operator", async () => {
    it("set operator", async () => {
      await expect(await zkSBT.operators(operatorOfZkSbtContract)).to.equal(
        false
      );
      await zkSBT
        .connect(ownerOfZkSbtContract)
        .setOperator(operatorOfZkSbtContract.address, true);

      await expect(await zkSBT.operators(operatorOfZkSbtContract)).to.equal(
        true
      );
    });
    it("unset operator", async () => {
      await expect(await zkSBT.operators(operatorOfZkSbtContract)).to.equal(
        true
      );
      await zkSBT
        .connect(ownerOfZkSbtContract)
        .setOperator(operatorOfZkSbtContract.address, false);
      await expect(await zkSBT.operators(operatorOfZkSbtContract)).to.equal(
        false
      );
    });
    it("only owner of zkSBT contract can set operaotr", async () => {
      await expect(
        zkSBT
          .connect(user_1)
          .setOperator(operatorOfZkSbtContract.address, false)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("setMintIdStatus", async () => {
    const mintId = 1;
    it("set mintId status to true", async () => {
      await expect(await zkSBT.mintIdStatus(mintId)).to.equal(false);

      await zkSBT.connect(ownerOfZkSbtContract).setMintIdStatus(mintId, true);

      await expect(await zkSBT.mintIdStatus(mintId)).to.equal(true);
    });
    it("set mintId status to false", async () => {
      await expect(await zkSBT.mintIdStatus(mintId)).to.equal(true);

      await zkSBT.setMintIdStatus(mintId, false);

      await expect(await zkSBT.mintIdStatus(mintId)).to.equal(false);
    });
    it("only operator of zkSBT contract can set mindId status", async () => {
      await expect(
        zkSBT.connect(user_1).setMintIdStatus(2, true)
      ).to.be.revertedWith("caller is not operator");
    });
  });
});

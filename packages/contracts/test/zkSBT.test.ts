import { deployContracts } from "./fixtures/testDeployContracts";
import { Pomp, ZkSBT } from "../typechain-types";
import { expect } from "chai";
import { Wallet } from "ethers";
import { ethers } from "hardhat";
import { generateRandomIdentityCommitment } from "../utils/utils";
import { solidity } from "ethereum-waffle";
import chai from "chai";
chai.use(solidity);

describe("ZkSBT basic test", async function () {
  //   let ownerOfPompContract: Wallet;
  let ownerOfZkSbtContract: Wallet;
  let operatorOfZkSbtContract: Wallet;
  let user_1: Wallet;
  let user_2: Wallet;
  //   let pomp: Pomp;
  let zkSBT: ZkSBT;

  before(async () => {
    ({
      //   ownerOfPompContract,
      ownerOfZkSbtContract,
      operatorOfZkSbtContract,
      user_1,
      user_2,
      //   pomp,
      zkSBT,
    } = await deployContracts());
  });

  describe("operator", async () => {
    it("set operator", async () => {
      await expect(
        await zkSBT.operators(operatorOfZkSbtContract.address)
      ).to.equal(false);
      await zkSBT
        .connect(ownerOfZkSbtContract)
        .setOperator(operatorOfZkSbtContract.address, true);

      await expect(
        await zkSBT.operators(operatorOfZkSbtContract.address)
      ).to.equal(true);
    });

    it("unset operator", async () => {
      await expect(
        await zkSBT.operators(operatorOfZkSbtContract.address)
      ).to.equal(true);
      await zkSBT
        .connect(ownerOfZkSbtContract)
        .setOperator(operatorOfZkSbtContract.address, false);
      await expect(
        await zkSBT.operators(operatorOfZkSbtContract.address)
      ).to.equal(false);
    });

    it("only owner of zkSBT contract can set operaotr", async () => {
      await expect(
        zkSBT
          .connect(user_1)
          .setOperator(operatorOfZkSbtContract.address, false)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("set operator emit event OperatorChange", async () => {
      await expect(
        zkSBT
          .connect(ownerOfZkSbtContract)
          .setOperator(operatorOfZkSbtContract.address, true)
      )
        .to.emit(zkSBT, "OperatorChange")
        .withArgs(operatorOfZkSbtContract.address, true);
    });
  });

  describe("mint", async () => {
    it("only operaor can mintWithSbtId", async () => {
      await expect(
        zkSBT.connect(user_2).mintWithSbtId(1, 2, 1, 1)
      ).to.be.revertedWith("caller is not operator");
    });

    it("identityCommitment can't be zero", async () => {
      await expect(
        zkSBT.connect(operatorOfZkSbtContract).mintWithSbtId(0, 2, 1, 1)
      ).to.be.revertedWith("invalid identityCommitment");
    });

    it("zkAddress can't collide", async () => {
      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(
          ethers.BigNumber.from("0b" + "0" + "1".padStart(255, "0")).toString(),
          2,
          1,
          1
        );

      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(
            ethers.BigNumber.from(
              "0b" + "1" + "1".padStart(255, "0")
            ).toString(),
            2,
            1,
            2
          )
      ).to.rejectedWith("collision of zkAddress");
    });

    it("can't mint same SBT twice", async () => {
      await zkSBT.connect(operatorOfZkSbtContract).mintWithSbtId(1, 2, 1, 3);

      await expect(
        zkSBT.connect(operatorOfZkSbtContract).mintWithSbtId(2, 2, 1, 3)
      ).to.revertedWith("ERC721: token already minted");
    });

    it("ownership check", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const asset = 2;
      const range = 1;
      const sbtId = 4;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, asset, range, sbtId);

      await expect(await zkSBT.ownerOf(sbtId)).to.equal(
        ethers.utils.getAddress(zkAddress)
      );
    });

    it("SBT metadata check", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const asset = 2;
      const range = 1;
      const sbtId = 5;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, asset, range, sbtId);

      const metadata = await zkSBT.sbtMetaData(5);
      expect(metadata[0].toString()).to.equal(asset.toString());
      expect(metadata[1].toString()).to.equal(range.toString());
    });
  });
  describe("Token uri", async () => {
    const baseUri = "zkSBT.metadata.manta.network/";
    it("set base tokenUri", async () => {
      await zkSBT.connect(operatorOfZkSbtContract).setBaseUri(baseUri);

      await expect(await zkSBT.baseUri()).to.equal(baseUri);
    });
    it("tokenUri", async () => {
      await zkSBT.connect(operatorOfZkSbtContract).setBaseUri(baseUri);

      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const asset = 2;
      const range = 1;
      const sbtId = 6;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, asset, range, sbtId);

      await expect(await zkSBT.tokenURI(sbtId)).to.equal(
        baseUri + sbtId.toString()
      );
    });
  });
  describe("SBT", async () => {
    it("SBT can't be transferred", async () => {
      const asset = 2;
      const range = 1;
      const sbtId = 7;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(user_2.address, asset, range, sbtId);

      await expect(await zkSBT.ownerOf(sbtId)).to.equal(user_2.address);

      await expect(
        zkSBT
          .connect(user_2)
          .transferFrom(user_2.address, user_1.address, sbtId)
      ).to.revertedWith("SBT can't be transferred");
    });
  });
});

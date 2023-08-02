import { deployContracts } from "./fixtures/deployMockContracts";
import { Pomp, ZkSBT } from "../typechain-types";
import { expect } from "chai";
import { BigNumber, Wallet } from "ethers";
import { ethers } from "hardhat";
import { generateRandomIdentityCommitment } from "../utils/utils";
import { solidity } from "ethereum-waffle";
import chai from "chai";
import { randomHex } from "../utils/encoding";
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
      const asset = 2;
      const range = 1;
      const sbtId = 1;
      await expect(
        zkSBT.connect(user_2).mintWithSbtId(1, asset, range, sbtId)
      ).to.be.revertedWith("caller is not operator");
    });

    it("identityCommitment can't be zero", async () => {
      const asset = 2;
      const range = 1;
      const sbtId = 1;
      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(0, asset, range, sbtId)
      ).to.be.revertedWith("invalid identityCommitment");
    });

    it("zkAddress can't collide", async () => {
      const asset = 2;
      const range = 1;
      const sbtId = 1;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(
          ethers.BigNumber.from("0x" + "0" + "1".padStart(63, "0")).toString(),
          asset,
          range,
          sbtId
        );

      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(
            ethers.BigNumber.from(
              "0x" + "1" + "1".padStart(63, "0")
            ).toString(),
            asset,
            range,
            2
          )
      ).to.revertedWith("collision of zkAddress");
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
  describe("burn sbt", async () => {
    // before(async () => {
    //   await zkSBT
    //     .connect(operatorOfZkSbtContract)
    //     .mintWithSbtId(identityCommitment, asset, range, sbtId);
    // });
    it("only operator can burn sbt", async () => {
      const asset = 2;
      const range = 1;
      const sbtId = BigNumber.from(randomHex(32));
      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(1, asset, range, sbtId)
      );

      await expect(zkSBT.connect(user_2).burn(sbtId)).to.be.revertedWith(
        "caller is not operator"
      );
    });
  });
  describe("zkSBT set", async () => {
    let baseUri: string;
    before(async () => {
      baseUri = "zkSBT.metadata.manta.network/";
      await zkSBT.connect(operatorOfZkSbtContract).setBaseUri(baseUri);
    });
    it("mint one zkSBT, and zkSBT should be updated", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const asset = 2;
      const range = 1;
      const sbtId = 8;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, asset, range, sbtId);

      await expect(await zkSBT.zkAddressSbtSet(zkAddress)).to.eql([
        [
          BigNumber.from(sbtId),
          BigNumber.from(asset),
          BigNumber.from(range),
          baseUri + sbtId.toString(),
        ],
      ]);
    });
    it("mint multi zkSBT, and zkSBT should be updated by order", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const asset_1 = 2;
      const range_1 = 1;
      const sbtId_1 = 9;

      const asset_2 = 2;
      const range_2 = 1;
      const sbtId_2 = 10;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, asset_1, range_1, sbtId_1);

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, asset_2, range_2, sbtId_2);

      await expect(await zkSBT.zkAddressSbtSet(zkAddress)).to.eql([
        [
          BigNumber.from(sbtId_1),
          BigNumber.from(asset_1),
          BigNumber.from(range_1),
          baseUri + sbtId_1.toString(),
        ],
        [
          BigNumber.from(sbtId_2),
          BigNumber.from(asset_2),
          BigNumber.from(range_2),
          baseUri + sbtId_2.toString(),
        ],
      ]);
    });
    it("after zkSBT has been burned, the zkSBT set should be updated", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const asset_1 = 2;
      const range_1 = 1;
      const sbtId_1 = 11;

      const asset_2 = 2;
      const range_2 = 1;
      const sbtId_2 = 12;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, asset_1, range_1, sbtId_1);

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, asset_2, range_2, sbtId_2);

      await expect(await zkSBT.zkAddressSbtSet(zkAddress)).to.eql([
        [
          BigNumber.from(sbtId_1),
          BigNumber.from(asset_1),
          BigNumber.from(range_1),
          baseUri + sbtId_1.toString(),
        ],
        [
          BigNumber.from(sbtId_2),
          BigNumber.from(asset_2),
          BigNumber.from(range_2),
          baseUri + sbtId_2.toString(),
        ],
      ]);

      await zkSBT.connect(operatorOfZkSbtContract).burn(sbtId_1);

      await expect(await zkSBT.zkAddressSbtSet(zkAddress)).to.eql([
        [
          BigNumber.from(sbtId_2),
          BigNumber.from(asset_2),
          BigNumber.from(range_2),
          baseUri + sbtId_2.toString(),
        ],
      ]);
    });
  });
});

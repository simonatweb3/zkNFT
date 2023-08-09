import { deployContracts } from "./fixtures/deployMockContracts";
import { Zksbt, Sbt } from "../typechain-types";
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
  let zkSBT: Sbt;

  before(async () => {
    ({
      //   ownerOfPompContract,
      ownerOfZkSbtContract,
      operatorOfZkSbtContract,
      user_1,
      user_2,
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
      const category = 2;
      const attribute = 1;
      const sbtId = 1;
      await expect(
        zkSBT.connect(user_2).mintWithSbtId(1, category, attribute, sbtId)
      ).to.be.revertedWith("caller is not operator");
    });

    it("identityCommitment can't be zero", async () => {
      const category = 2;
      const attribute = 1;
      const sbtId = 1;
      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(0, category, attribute, sbtId)
      ).to.be.revertedWith("invalid identityCommitment");
    });

    it("zkAddress can't collide", async () => {
      const category = 2;
      const attribute = 1;
      const sbtId = 1;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(
          ethers.BigNumber.from("0x" + "0" + "1".padStart(63, "0")).toString(),
          category,
          attribute,
          sbtId
        );

      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(
            ethers.BigNumber.from(
              "0x" + "1" + "1".padStart(63, "0")
            ).toString(),
            category,
            attribute,
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

      const category = 2;
      const attribute = 1;
      const sbtId = 4;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, category, attribute, sbtId);

      await expect(await zkSBT.ownerOf(sbtId)).to.equal(
        ethers.utils.getAddress(zkAddress)
      );
    });

    it("SBT metadata check", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const category = 2;
      const attribute = 1;
      const sbtId = 5;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, category, attribute, sbtId);

      const metadata = await zkSBT.sbtMetaData(5);
      expect(metadata[0].toString()).to.equal(category.toString());
      expect(metadata[1].toString()).to.equal(attribute.toString());
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

      const category = 2;
      const attribute = 1;
      const sbtId = 6;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, category, attribute, sbtId);

      await expect(await zkSBT.tokenURI(sbtId)).to.equal(
        baseUri + sbtId.toString()
      );
    });
  });
  describe("SBT", async () => {
    it("SBT can't be transferred", async () => {
      const category = 2;
      const attribute = 1;
      const sbtId = 7;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(user_2.address, category, attribute, sbtId);

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
    //     .mintWithSbtId(identityCommitment, category, attribute, sbtId);
    // });
    it("only operator can burn sbt", async () => {
      const category = 2;
      const attribute = 1;
      const sbtId = BigNumber.from(randomHex(32));
      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(1, category, attribute, sbtId)
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

      const category = 2;
      const attribute = 1;
      const sbtId = 8;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, category, attribute, sbtId);

      await expect(await zkSBT.zkAddressSbtSet(zkAddress)).to.eql([
        [
          BigNumber.from(sbtId),
          BigNumber.from(category),
          BigNumber.from(attribute),
          baseUri + sbtId.toString(),
        ],
      ]);
    });
    it("mint multi zkSBT, and zkSBT should be updated by order", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const category_1 = 2;
      const attribute_1 = 1;
      const sbtId_1 = 9;

      const category_2 = 2;
      const attribute_2 = 1;
      const sbtId_2 = 10;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, category_1, attribute_1, sbtId_1);

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, category_2, attribute_2, sbtId_2);

      await expect(await zkSBT.zkAddressSbtSet(zkAddress)).to.eql([
        [
          BigNumber.from(sbtId_1),
          BigNumber.from(category_1),
          BigNumber.from(attribute_1),
          baseUri + sbtId_1.toString(),
        ],
        [
          BigNumber.from(sbtId_2),
          BigNumber.from(category_2),
          BigNumber.from(attribute_2),
          baseUri + sbtId_2.toString(),
        ],
      ]);
    });
    it("after zkSBT has been burned, the zkSBT set should be updated", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const category_1 = 2;
      const attribute_1 = 1;
      const sbtId_1 = 11;

      const category_2 = 2;
      const attribute_2 = 1;
      const sbtId_2 = 12;

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, category_1, attribute_1, sbtId_1);

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(identityCommitment, category_2, attribute_2, sbtId_2);

      await expect(await zkSBT.zkAddressSbtSet(zkAddress)).to.eql([
        [
          BigNumber.from(sbtId_1),
          BigNumber.from(category_1),
          BigNumber.from(attribute_1),
          baseUri + sbtId_1.toString(),
        ],
        [
          BigNumber.from(sbtId_2),
          BigNumber.from(category_2),
          BigNumber.from(attribute_2),
          baseUri + sbtId_2.toString(),
        ],
      ]);

      await zkSBT.connect(operatorOfZkSbtContract).burn(sbtId_1);

      await expect(await zkSBT.zkAddressSbtSet(zkAddress)).to.eql([
        [
          BigNumber.from(sbtId_2),
          BigNumber.from(category_2),
          BigNumber.from(attribute_2),
          baseUri + sbtId_2.toString(),
        ],
      ]);
    });
  });
});

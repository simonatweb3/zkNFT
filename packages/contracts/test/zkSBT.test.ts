import { deployContracts } from "./fixtures/deployContracts";
import { Pomp, ZkSBT } from "../typechain-types";
import { expect } from "chai";
import { Wallet } from "ethers";
import { ethers } from "hardhat";
import { generateRandomIdentityCommitment } from "../utils/utils";

describe("ZkSBT basic test", async function () {
  let ownerOfPompContract: Wallet;
  let ownerOfZkSbtContract: Wallet;
  let operatorOfZkSbtContract: Wallet;
  let user_1: Wallet;
  let user_2: Wallet;
  let pomp: Pomp;
  let zkSBT: ZkSBT;

  before(async () => {
    ({
      ownerOfPompContract,
      ownerOfZkSbtContract,
      operatorOfZkSbtContract,
      user_1,
      user_2,
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

    it("set mintId status, emit event MintIdStatusChange", async () => {
      await expect(
        zkSBT.connect(operatorOfZkSbtContract).setMintIdStatus(2, true)
      )
        .to.emit(zkSBT, "MintIdStatusChange")
        .withArgs(2, true);
    });
  });

  describe("mint", async () => {
    this.beforeAll(async () => {
      await zkSBT.connect(ownerOfZkSbtContract).setMintIdStatus(2, true);
    });

    it("only operaor can mintWithSbtId", async () => {
      await expect(
        zkSBT
          .connect(user_2)
          .mintWithSbtId(
            1,
            2,
            1,
            ethers.ZeroAddress,
            1,
            1,
            1,
            ethers.toUtf8Bytes("")
          )
      ).to.be.revertedWith("caller is not operator");
    });

    it("identityCommitment can't be zero", async () => {
      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(
            0,
            2,
            1,
            ethers.ZeroAddress,
            1,
            1,
            1,
            ethers.toUtf8Bytes("")
          )
      ).to.be.revertedWith("invalid identityCommitment");
    });

    it("only opened mintId", async () => {
      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(
            1,
            3,
            1,
            ethers.ZeroAddress,
            1,
            1,
            1,
            ethers.toUtf8Bytes("")
          )
      ).to.be.revertedWith("mintId not available");
    });

    it("zkAddress can't collide", async () => {
      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(
          ethers.toBigInt("0b" + "0" + "1".padStart(255, "0")).toString(),
          2,
          1,
          ethers.ZeroAddress,
          1,
          1,
          1,
          ethers.toUtf8Bytes("")
        );

      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(
            ethers.toBigInt("0b" + "1" + "1".padStart(255, "0")).toString(),
            2,
            1,
            ethers.ZeroAddress,
            1,
            1,
            1,
            ethers.toUtf8Bytes("")
          )
      ).to.rejectedWith("collision of zkAddress");
    });

    it("can't mint same SBT twice", async () => {
      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(
          1,
          2,
          1,
          ethers.ZeroAddress,
          1,
          2,
          1,
          ethers.toUtf8Bytes("")
        );

      await expect(
        zkSBT
          .connect(operatorOfZkSbtContract)
          .mintWithSbtId(
            2,
            2,
            1,
            ethers.ZeroAddress,
            1,
            2,
            1,
            ethers.toUtf8Bytes("")
          )
      ).to.revertedWith("ERC721: token already minted");
    });

    it("ownership check", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(
          identityCommitment,
          2,
          1,
          ethers.ZeroAddress,
          1,
          3,
          1,
          ethers.toUtf8Bytes("")
        );

      await expect(await zkSBT.ownerOf(3)).to.equal(
        ethers.getAddress(zkAddress)
      );
    });

    it("SBT metadata check", async () => {
      const { identityCommitment, zkAddress } =
        generateRandomIdentityCommitment();

      const mintId = 2;
      const chainId = 1;
      const assetContractAddress = ethers.ZeroAddress;
      const assetTokenId = 1;
      const sbtId = 4;
      const range = 1;
      const data = ethers.toUtf8Bytes("hello, zkSBT");

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(
          identityCommitment,
          mintId,
          chainId,
          assetContractAddress,
          assetTokenId,
          sbtId,
          range,
          data
        );

      const metadata = await zkSBT.sbtMetaData(4);
      expect(metadata[0].toString()).to.equal(mintId.toString());
      expect(metadata[1].toString()).to.equal(chainId.toString());
      expect(metadata[2].toString()).to.equal(assetContractAddress.toString());
      expect(metadata[3].toString()).to.equal(assetTokenId.toString());
      expect(metadata[4].toString()).to.equal(range.toString());
      expect(metadata[5].toString()).to.equal(
        ethers.hexlify(ethers.toUtf8Bytes("hello, zkSBT"))
      );
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

      const mintId = 2;
      const chainId = 1;
      const assetContractAddress = ethers.ZeroAddress;
      const assetTokenId = 1;
      const sbtId = 5;
      const range = 1;
      const data = ethers.toUtf8Bytes("");

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(
          identityCommitment,
          mintId,
          chainId,
          assetContractAddress,
          assetTokenId,
          sbtId,
          range,
          data
        );

      await expect(await zkSBT.tokenURI(5)).to.equal(baseUri + "5");
    });
  });
  describe("SBT", async () => {
    it("SBT can't be transferred", async () => {
      const mintId = 2;
      const chainId = 1;
      const assetContractAddress = ethers.ZeroAddress;
      const assetTokenId = 1;
      const sbtId = 6;
      const range = 1;
      const data = ethers.toUtf8Bytes("hello, zkSBT");

      await zkSBT
        .connect(operatorOfZkSbtContract)
        .mintWithSbtId(
          user_2.address,
          mintId,
          chainId,
          assetContractAddress,
          assetTokenId,
          sbtId,
          range,
          data
        );

      await expect(await zkSBT.ownerOf(6)).to.equal(user_2.address);

      await expect(
        zkSBT.connect(user_2).transferFrom(user_2.address, user_1.address, 6)
      ).to.revertedWith("SBT can't be transferred");
    });
  });
});

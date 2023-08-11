import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ethers, upgrades } from "hardhat"
import * as fs from 'fs';
import { verify, verify2, writeToEnv } from "./verify";
import { ZksbtVerifier__factory } from "../typechain-types";
const hre = require('hardhat');

async function upgradeVerifier(
    owner : SignerWithAddress
) {
    const PROXY_ADDR = process.env.VERIFIER
    const cf : ZksbtVerifier__factory = new ZksbtVerifier__factory(owner)

    let old_target = await upgrades.erc1967.getImplementationAddress(PROXY_ADDR)
    const c = await upgrades.upgradeProxy(PROXY_ADDR, cf)
    await c.deployed()

    let new_target = await upgrades.erc1967.getImplementationAddress(PROXY_ADDR)
    let upgrade_flag = "\n# ++++++ upgrade " + hre.hardhatArguments.network + " on " + new Date().toUTCString() + " ++++++++++++"
    fs.appendFileSync('.env', upgrade_flag)
    if (old_target.toLowerCase() != new_target.toLowerCase()) {
	    writeToEnv("# VERIFIER PROXY " + PROXY_ADDR + " NEW_TARGET", new_target)
        await verify(new_target)
    }

}

async function upgradeZksbt(
    owner : SignerWithAddress
) {
    const IBTREE_ADDR = process.env.IBTree
    const VERIFIER_ADDR = process.env.VERIFIER
    const SBT_ADDR = process.env.SBT
    const PROXY_ADDR = process.env.ZKSBT
    let old_target = await upgrades.erc1967.getImplementationAddress(PROXY_ADDR)

    const cf = await ethers.getContractFactory("Zksbt", {
        libraries: {
          IncrementalBinaryTree: IBTREE_ADDR
        }
      })

    const params = [VERIFIER_ADDR, 10, SBT_ADDR]
    const c = await upgrades.upgradeProxy(PROXY_ADDR, cf, { unsafeAllowLinkedLibraries: ['IncrementalBinaryTree'] })
    await c.deployed()

    let new_target = await upgrades.erc1967.getImplementationAddress(PROXY_ADDR)
    let upgrade_flag = "\n# ++++++ upgrade " + hre.hardhatArguments.network + " on " + new Date().toUTCString() + " ++++++++++++"
    fs.appendFileSync('.env', upgrade_flag)
    if (old_target.toLowerCase() != new_target.toLowerCase()) {
	    writeToEnv("# ZKSBT PROXY " + PROXY_ADDR + " NEW_TARGET", new_target)
        await verify2(c.address, params)
    }

}

async function upgrade(
    owner : SignerWithAddress
) {
    await upgradeVerifier(owner)
    await upgradeZksbt(owner)
}


if (process.env.UPGRADE_ZKSBT) {
    describe("Upgrade ZKSBT", function () {
      this.timeout(6000000);
      let owner: SignerWithAddress;
      before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
      });
  
      it("Upgrade", async function () {
        await upgrade(owner)
      });
    });
  }
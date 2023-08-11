import { ethers } from "hardhat" 

import * as fs from 'fs';

const hre = require('hardhat');
export function is_hardhat_local_network() {
	return hre.hardhatArguments.network == undefined ||
		   hre.hardhatArguments.network == "localhost" ||
		   hre.hardhatArguments.network == "ganache" ||
		   hre.hardhatArguments.network == "hardhat"

}

export function writeToEnv(name:string, value:string) {
	if (is_hardhat_local_network()) {
		name = "TEST_" + name
	}
	console.log(name, " : ", value)
    let str = "\n" + name + " = " + value
    fs.appendFileSync('.env', str)
	process.env[name] = value
}

export function readEnv(name:string) {
	if (is_hardhat_local_network()) {
		name = "TEST_" + name
	}
	return process.env[name]
}

export function sleep(ms) {
	console.log("sleep ", ms, " ms")
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitEtherscan(addr: string) {

	// wait deploy contract ready on chain
	while(1) {
	  const code = await ethers.provider.getCode(addr)
	  if (code.length > 2) {
		break
	  } else {
		console.log("waiting ")
		await sleep(10000)
	  }
	}
}

export async function verify(addr: string) {
	if (!is_hardhat_local_network()) {
		await waitEtherscan(addr)
		try {
			await hre.run('verify', {address : addr});
		} catch (e) {
			console.error(e);
		}
	}
}

export async function verify2(addr: string, args) {
	if (typeof hre.hardhatArguments.network != "undefined") {
		await waitEtherscan(addr)
		try {
			// await hre.run('verify:verify', {address : addr, constructorArguments : args});
			await hre.run('verify', {address : addr, constructorArguments : args});
		} catch (e) {
			console.error(e);
		}
	}
}
import { MerkleProof } from "@zk-kit/incremental-merkle-tree";
import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import {BigNumberish, Proof, SnarkJSProof } from "@semaphore-protocol/proof"
// import packProof from "@semaphore-protocol/proof/src/packProof"
// import unpackProof from "@semaphore-protocol/proof/src/unpackProof"
import { BytesLike, Hexable } from "@ethersproject/bytes"
import { poseidon2 } from "poseidon-lite/poseidon2"
import { BigNumber } from "@ethersproject/bignumber"
import { expect } from "chai";
import * as fs from "fs";
import hash from "./hash"
const snarkjs = require('snarkjs');
import { ethers } from "ethers";
const TREE_DEPTH = 16

import log4js from "log4js"
export const logger = log4js.getLogger();
logger.level = "debug";
const { buildBabyjub } = require('circomlibjs');

export async function attribute2jub(
    attribute : string
) {
    const jub = await buildBabyjub()
    //const JUB_CURVE_R = jub.p
    const JUB_CURVE_R = BigInt(21888242871839275222246405745257275088548364400416034343698204186575808495617)
    return BigInt(ethers.utils.solidityKeccak256(['string'], [attribute])) % JUB_CURVE_R
}

export function get_circuit_wasm_file(
    CUR_CIRCUIT : string
) {
    return process.cwd() + "/wasm/" + CUR_CIRCUIT + ".wasm"
}

export function get_circuit_zkey_file(
    CUR_CIRCUIT : string
) {
    const FILE_ZKEY_FINAL = process.cwd() + "/zkey/" + CUR_CIRCUIT + ".zkey"
    const FILE_ZKEY_PLONK = process.cwd() + "/zkey/" + CUR_CIRCUIT + "zkey.plonk"
    return {
        growth16 : FILE_ZKEY_FINAL,
        plonk : FILE_ZKEY_PLONK
    }
}


export declare type PublicSignals = {
    merkleRoot: BigNumberish;
    nullifierHash: BigNumberish;
    externalNullifier: BigNumberish;
};
export declare type FullProof = {
    proof: Proof;
    publicSignals: PublicSignals;
};

function packProof(originalProof: SnarkJSProof): Proof {
    return [
        originalProof.pi_a[0],
        originalProof.pi_a[1],
        originalProof.pi_b[0][1],
        originalProof.pi_b[0][0],
        originalProof.pi_b[1][1],
        originalProof.pi_b[1][0],
        originalProof.pi_c[0],
        originalProof.pi_c[1]
    ]
}

function unpackProof(proof: Proof): SnarkJSProof {
    return {
        pi_a: [proof[0], proof[1]],
        pi_b: [
            [proof[3], proof[2]],
            [proof[5], proof[4]]
        ],
        pi_c: [proof[6], proof[7]],
        protocol: "groth16",
        curve: "bn128"
    }
}

export default async function generateProof(
    identity : Identity,
    externalNullifier: BytesLike | Hexable | number | bigint,
    zksbt : bigint,
    attribute : string,
    verifyTimestamp : bigint,
    beginTimestamp : bigint,
    endTimestamp : bigint,
    group: Group,
    wasmFile : string,
    zkeyFile : string
): Promise<FullProof> {
    console.log(new Date().toUTCString() + " generateProof for wasm : ", wasmFile, ", zkey : ", zkeyFile)

    let zksbt_commitment = poseidon2([
            identity.getCommitment(),
            zksbt
        ])
    zksbt_commitment = poseidon2([
            zksbt_commitment,
            verifyTimestamp
        ])
    zksbt_commitment = poseidon2([
            zksbt_commitment,
            await attribute2jub(attribute)
        ])
    
    const merkleProof: MerkleProof = group.generateMerkleProof(group.indexOf(zksbt_commitment))

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        {
            identityTrapdoor: identity.getTrapdoor(),
            identityNullifier: identity.getNullifier(),
            treePathIndices: merkleProof.pathIndices,
            treeSiblings: merkleProof.siblings,
            externalNullifier: hash(externalNullifier),
            attribute : await attribute2jub(attribute),
            zksbt : zksbt,
            verifyTimestamp : verifyTimestamp,
            beginTimestamp : beginTimestamp,
            endTimestamp : endTimestamp
        },
        wasmFile,
        zkeyFile
    )

    console.log("publicSignals : ", publicSignals)

    const fullProof = {
        proof : packProof(proof),
        publicSignals: {
            merkleRoot: publicSignals[0],
            nullifierHash: publicSignals[1],
            externalNullifier: BigNumber.from(externalNullifier).toString(),
            attribute : await attribute2jub(attribute),
            beginTimestamp : beginTimestamp,
            endTimestamp : endTimestamp
        }
    }

    console.log(new Date().toUTCString() + " fullProof.publicSignals : ", fullProof.publicSignals)
    return fullProof
}

async function test() {
    // 1/3. identity derive
    const identity = new Identity(
        "{ trapdoor : 1, nullifier : 2}"
    )

    // 2/3. add identity to group
    const verifyTimestamp = BigInt(1)
    const beginTimestamp = BigInt(0)
    const endTimestamp = BigInt(2)
    const zksbt = BigInt(1)
    const attribute = "0.1"

    let zksbt_commitment = poseidon2([
        identity.getCommitment(),
        zksbt
    ])
    zksbt_commitment = poseidon2([
            zksbt_commitment,
            verifyTimestamp
        ])
    zksbt_commitment = poseidon2([
            zksbt_commitment,
            await attribute2jub(attribute)
        ])

    const group = new Group(123, TREE_DEPTH, [
        zksbt_commitment
    ])

    // 3/3. generate witness, prove, verify
    const externalNullifier = "1234"
    const proof =  await generateProof(
        identity,
        externalNullifier,
        zksbt,
        attribute,
        verifyTimestamp, beginTimestamp, endTimestamp,
        group,
        get_circuit_wasm_file("zksbt"),
        get_circuit_zkey_file("zksbt").growth16
    )

    // off-chain verify proof
    const zkey_final = {
        type : "mem",
        data : new Uint8Array(Buffer.from(fs.readFileSync(get_circuit_zkey_file("zksbt").growth16)))
    }
    const vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
    const publicSignals = [
        proof.publicSignals.merkleRoot,
        proof.publicSignals.nullifierHash,
        hash(externalNullifier),
        await attribute2jub(attribute),
        beginTimestamp,
        endTimestamp
    ]

    console.log("verify publicSignals : ", publicSignals)
    expect(await snarkjs.groth16.verify(
        vKey,
        publicSignals,
        unpackProof(proof.proof),
        logger
    )).eq(true)

    //let solidityGroupProof: SolidityProof = packToSolidityProof(groupProof.proof)
    console.log("circuit test DONE!")
}

test()
.then(() => process.exit(0))
.catch(error => {
  console.error(error);
  process.exit(1);
});

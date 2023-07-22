import { MerkleProof } from "@zk-kit/incremental-merkle-tree";
import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import {BigNumberish, Proof, SnarkJSProof } from "@semaphore-protocol/proof"
// import packProof from "@semaphore-protocol/proof/src/packProof"
// import unpackProof from "@semaphore-protocol/proof/src/unpackProof"
import { poseidon2 } from "poseidon-lite/poseidon2"
import { BytesLike, Hexable } from "@ethersproject/bytes"
import { BigNumber } from "@ethersproject/bignumber"
const snarkjs = require('snarkjs');

export declare type PublicSignals = {
    merkleRoot: BigNumberish;
    nullifierHash: BigNumberish;
    externalNullifier: BigNumberish;
};
export declare type FullProof = {
    proof: Proof;
    publicSignals: PublicSignals;
};

export function packProof(originalProof: SnarkJSProof): Proof {
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

export function unpackProof(proof: Proof): SnarkJSProof {
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

export async function generateProof(
    identity : Identity,
    externalNullifier: BytesLike | Hexable | number | bigint,
    zksbt : bigint,
    group: Group,
    wasmFile : string,
    zkeyFile : string
): Promise<FullProof> {
    console.log(new Date().toUTCString() + " generateProof for wasm : ", wasmFile, ", zkey : ", zkeyFile)

    const pomp_commitment = poseidon2([identity.getCommitment(), zksbt])
    const merkleProof: MerkleProof = group.generateMerkleProof(group.indexOf(pomp_commitment))

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        {
            identityTrapdoor: identity.getTrapdoor(),
            identityNullifier: identity.getNullifier(),
            treePathIndices: merkleProof.pathIndices,
            treeSiblings: merkleProof.siblings,
            //externalNullifier: hash(externalNullifier),
            externalNullifier: externalNullifier,
            zksbt : zksbt
        },
        wasmFile,
        zkeyFile
    )

    const fullProof = {
        proof : packProof(proof),
        publicSignals: {
            merkleRoot: publicSignals[0],
            nullifierHash: publicSignals[1],
            externalNullifier: BigNumber.from(externalNullifier).toString()
        }
    }

    console.log(new Date().toUTCString() + " fullProof.publicSignals : ", fullProof.publicSignals)
    return fullProof
}
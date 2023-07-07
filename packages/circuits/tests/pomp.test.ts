import { MerkleProof } from "@zk-kit/incremental-merkle-tree";
import { Group } from "@semaphore-protocol/group"
import { Identity } from "@semaphore-protocol/identity"
import {BigNumberish, Proof, SnarkJSProof } from "@semaphore-protocol/proof"
// import packProof from "@semaphore-protocol/proof/src/packProof"
// import unpackProof from "@semaphore-protocol/proof/src/unpackProof"
import { BytesLike, Hexable } from "@ethersproject/bytes"
import { BigNumber } from "@ethersproject/bignumber"
import { expect } from "chai";
import * as fs from "fs";
import hash from "./hash"
const snarkjs = require('snarkjs');
const TREE_DEPTH = 10

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
    trapdoor : bigint,
    nullifier : bigint,
    commitment : bigint,
    externalNullifier: BytesLike | Hexable | number | bigint,
    //externalNullifier: bigint,
    //sbt_id : bigint,
    group: Group,
    wasmFile : string,
    zkeyFile : string
): Promise<FullProof> {
    console.log(new Date().toUTCString() + " generateProof for wasm : ", wasmFile, ", zkey : ", zkeyFile)

    const merkleProof: MerkleProof = group.generateMerkleProof(group.indexOf(commitment))

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        {
            identityTrapdoor: trapdoor,
            identityNullifier: nullifier,
            treePathIndices: merkleProof.pathIndices,
            treeSiblings: merkleProof.siblings,
            externalNullifier: hash(externalNullifier)
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
            //externalNullifier: publicSignals[2]
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
    const identityCommitment = identity.getCommitment()

    // 2/3. add identity to group
    const group = new Group(123, TREE_DEPTH, [identityCommitment])

    // 3/3. generate witness, prove, verify
    const externalNullifier = "1234"
    const proof =  await generateProof(
        identity.getTrapdoor(),
        identity.getNullifier(),
        identityCommitment,
        externalNullifier,
        group,
        get_circuit_wasm_file("pomp"),
        get_circuit_zkey_file("pomp").growth16
    )

    // off-chain verify proof
    const zkey_final = {
        type : "mem",
        data : new Uint8Array(Buffer.from(fs.readFileSync(get_circuit_zkey_file("pomp").growth16)))
    }
    const vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
    expect(await snarkjs.groth16.verify(
        vKey,
        [
            proof.publicSignals.merkleRoot,
            proof.publicSignals.nullifierHash,
            hash(externalNullifier)
        ],
        unpackProof(proof.proof)
    )).eq(true)

    //let solidityGroupProof: SolidityProof = packToSolidityProof(groupProof.proof)

}

test()
.then(() => process.exit(0))
.catch(error => {
  console.error(error);
  process.exit(1);
});

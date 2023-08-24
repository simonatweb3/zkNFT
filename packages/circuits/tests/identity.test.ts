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
    identityCommitment: BigNumberish;
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
    wasmFile : string,
    zkeyFile : string
): Promise<FullProof> {
    console.log(new Date().toUTCString() + " generateProof for wasm : ", wasmFile, ", zkey : ", zkeyFile)

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        {
            identityTrapdoor: identity.getTrapdoor(),
            identityNullifier: identity.getNullifier(),
            externalNullifier: hash(externalNullifier)
        },
        wasmFile,
        zkeyFile
    )

    console.log("generateProof publicSignals : ", publicSignals)

    const fullProof = {
        proof : packProof(proof),
        publicSignals: {
            externalNullifier: BigNumber.from(externalNullifier).toString(),
            identityCommitment : identity.getCommitment().toString(),
            nullifierHash: publicSignals[1]
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

    // 3/3. generate witness, prove, verify
    const externalNullifier = "1234"
    const proof =  await generateProof(
        identity,
        externalNullifier,
        get_circuit_wasm_file("zksbt"),
        get_circuit_zkey_file("zksbt").growth16
    )

    // off-chain verify proof
    const zkey_final = {
        type : "mem",
        data : new Uint8Array(Buffer.from(fs.readFileSync(get_circuit_zkey_file("zksbt").growth16)))
    }
    const vKey = await snarkjs.zKey.exportVerificationKey(zkey_final);
    expect(await snarkjs.groth16.verify(
        vKey,
        [
            proof.publicSignals.identityCommitment,
            proof.publicSignals.nullifierHash,
            hash(externalNullifier)
        ],
        unpackProof(proof.proof)
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

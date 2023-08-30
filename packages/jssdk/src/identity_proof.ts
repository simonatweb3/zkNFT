import { Identity } from "@semaphore-protocol/identity"
import {BigNumberish, Proof, SnarkJSProof } from "@semaphore-protocol/proof"
// import packProof from "@semaphore-protocol/proof/src/packProof"
// import unpackProof from "@semaphore-protocol/proof/src/unpackProof"
//import { BytesLike, Hexable } from "@ethersproject/bytes"
//import { BigNumber } from "@ethersproject/bignumber"
const snarkjs = require('snarkjs');
//import * as snarkjs from "snarkjs"

declare type PublicSignals = {
    identityCommitment: BigNumberish;
    nullifierHash: BigNumberish;
    externalNullifier: BigNumberish;
};

export declare type IdentityFullProof = {
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

export async function generateIdentityProof(
  identity : Identity,
  externalNullifier: bigint,
  wasmFile : string,
  zkeyFile : string
): Promise<IdentityFullProof> {
  console.log(new Date().toUTCString() + " generateProof for wasm : ", wasmFile, ", zkey : ", zkeyFile)

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
      identityTrapdoor: identity.getTrapdoor(),
      identityNullifier: identity.getNullifier(),
      externalNullifier: externalNullifier
    },
    wasmFile,
    zkeyFile
  )

  const fullProof = {
    proof : packProof(proof),
    publicSignals: {
      identityCommitment : identity.getCommitment().toString(),
      nullifierHash: publicSignals[1],
      externalNullifier: externalNullifier
    }
  }

  console.log(new Date().toUTCString() + " fullProof.publicSignals : ", fullProof.publicSignals)
  return fullProof
}
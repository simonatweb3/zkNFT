pragma circom 2.0.0;

include "../../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../../node_modules/circomlib/circuits/comparators.circom";
include "../common/tree.circom";

template CalculateSecret() {
    signal input identityNullifier;
    signal input identityTrapdoor;

    signal output out;

    component poseidon = Poseidon(2);

    poseidon.inputs[0] <== identityNullifier;
    poseidon.inputs[1] <== identityTrapdoor;

    out <== poseidon.out;
}

template CalculateNullifierHash() {
    signal input externalNullifier;
    signal input identityNullifier;

    signal output out;

    component poseidon = Poseidon(2);

    poseidon.inputs[0] <== externalNullifier;
    poseidon.inputs[1] <== identityNullifier;

    out <== poseidon.out;
}

template CalculateIdentityCommitment() {
    signal input secret;

    signal output out;

    component poseidon = Poseidon(1);

    poseidon.inputs[0] <== secret;

    out <== poseidon.out;
}


// nLevels must be < 32.
template Zksbt(nLevels) {
    signal input identityNullifier;
    signal input identityTrapdoor;
    signal input treePathIndices[nLevels];
    signal input treeSiblings[nLevels];

    signal input externalNullifier;

    signal input zksbt;             // private
    signal input verifyTimestamp;   // private
    signal input beginTimestamp;    // public
    signal input endTimestamp;      // public

    signal output root;
    signal output nullifierHash;

    component gt1 = GreaterEqThan(252);
    gt1.in[0] <== verifyTimestamp;
    gt1.in[1] <== beginTimestamp;
    assert(gt1.out > 0);

    component gt2 = GreaterEqThan(252);
    gt2.in[1] <== verifyTimestamp;
    gt2.in[0] <== endTimestamp;
    assert(gt2.out > 0);

    component calculateSecret = CalculateSecret();
    calculateSecret.identityNullifier <== identityNullifier;
    calculateSecret.identityTrapdoor <== identityTrapdoor;

    signal secret;
    secret <== calculateSecret.out;

    component calculateIdentityCommitment = CalculateIdentityCommitment();
    calculateIdentityCommitment.secret <== secret;

    // zksbt/verifyTimestamp bind identity
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== calculateIdentityCommitment.out;
    poseidon.inputs[1] <== zksbt;
    poseidon.inputs[2] <== verifyTimestamp;

    component calculateNullifierHash = CalculateNullifierHash();
    calculateNullifierHash.externalNullifier <== externalNullifier;
    calculateNullifierHash.identityNullifier <== identityNullifier;

    component inclusionProof = MerkleTreeInclusionProof(nLevels);
    inclusionProof.leaf <== poseidon.out; // using zksbt-bind identity.
    //inclusionProof.leaf <== calculateIdentityCommitment.out;

    for (var i = 0; i < nLevels; i++) {
        inclusionProof.siblings[i] <== treeSiblings[i];
        inclusionProof.pathIndices[i] <== treePathIndices[i];
    }

    root <== inclusionProof.root;
    nullifierHash <== calculateNullifierHash.out;
}

component main {public [externalNullifier, beginTimestamp, endTimestamp]} = Zksbt(16);

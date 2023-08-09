// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interface/sbt.sol";
import "./spec.sol";
import "hardhat/console.sol";

interface IVerifier {
  function verifyProof(
    uint256[2] memory a,
    uint256[2][2] memory b,
    uint256[2] memory c,
    uint256[] memory input
  ) external view returns (bool);
}

struct Pool {
  uint id;
  string name;
  uint depth;
  uint salt;
}

contract Zksbt is SemaphoreGroups, Ownable {
  bytes constant ZKSBT_CLAIM_MESSAGE = "Sign this meesage to claim zkSBT : ";
  uint constant POMP_POOL_DEPTH = 10;
  mapping(uint256 => IVerifier) public verifiers;

  uint public latestPoolId;
  SbtInterface public iSbt;

  // sbt(category, attr) --> pools
  mapping(uint => Pool) public pools;

  // sbt(category, attr) --> public address --> sbt_id
  mapping(uint => mapping(uint => uint)) public sbt_minted;
  event SbtMinted(uint indexed identity, uint sbt);

  event ZkSbtAddressChange(
    address indexed oldAddress,
    address indexed newAddress
  );

  constructor(
    IVerifier _verifier,
    uint poolDepth,
    SbtInterface _iSbt
  ) Ownable() {
    // zksbt verifier
    verifiers[poolDepth] = _verifier;

    // init build-in zksbt pool
    latestPoolId = 0;

    _createSbtPool(pompToSbt(uint32(ASSET.ETH), uint32(RANGE.RANGE_100), 0), "POMP-ETH-RANGE_100", poolDepth);
    _createSbtPool(pompToSbt(uint32(ASSET.BNB), uint32(RANGE.RANGE_100), 0), "POMP-BNB-RANGE_100", poolDepth);

    iSbt = _iSbt;
  }


  // TODO: re-entracy control
  function _createSbtPool(
    uint sbt,
    string memory name,
    uint poolDepth
  ) internal returns (uint) {
    _createGroup(latestPoolId, poolDepth);
    pools[sbt] = Pool({
      id: latestPoolId++,
      name: name,
      depth: poolDepth,
      salt:0
    });
    return latestPoolId;
  }

  function getSbtPoolV2(
    uint sbt
  ) public view returns (Pool memory) {
    return pools[getSbtMeta(sbt)];
  }

  function getSbtPool(
    uint64 category,
    uint64 attribute
  ) public view returns (Pool memory) {
    return pools[category << 64 + attribute];
  }

  function createSbtPool(
    uint sbt,
    string calldata name,
    uint poolDepth
  ) public onlyOwner returns (uint) {
    return _createSbtPool(sbt, name, poolDepth);
  }

  // batch mint
  function mint(
    uint[] calldata identity,
    uint[] calldata sbt,
    bytes[] calldata certificate_signature
  ) public onlyOwner {
    for (uint256 idx = 0; idx < identity.length; idx++) {
      bytes memory message = bytes.concat(ZKSBT_CLAIM_MESSAGE,
        " identity ",
        bytes(Strings.toString(identity[idx])),
        " sbt category ",
        bytes(Strings.toString(getSbtCategory(sbt[idx]))),
        " sbt attribute ",
        bytes(Strings.toString(getSbtAttribute(sbt[idx]))),
        " sbt id ",
        bytes(Strings.toString(getSbtId(sbt[idx])))
      );
      console.log("getSbtId : ", getSbtId(sbt[idx]));
      // console.log("message : ");
      // console.logBytes(message);
      bytes32 msgHash = ECDSA.toEthSignedMessageHash(message);
      address signer = ECDSA.recover(msgHash, certificate_signature[idx]);
      require(signer == owner(), "Invalid Certificate Signature!");

      _addMember(pools[getSbtMeta(sbt[idx])].id, identity[idx]);

      //console.log("sol meta data : ", getSbtMeta(sbt[idx]));
      sbt_minted[getSbtMeta(sbt[idx])][identity[idx]] = getSbtId(sbt[idx]);

      // TODO : normalized sbt spec
      bool success = iSbt.mintWithSbtId(identity[idx], getSbtCategory(sbt[idx]), getSbtAttribute(sbt[idx]), sbt[idx]);
      require(success, "failed to mint zkSBT");

      emit SbtMinted(identity[idx], sbt[idx]);
    }
  }

  // verify with given merkle root and given salt
  function verifyWithRootAndSalt(
    uint sbt,
    uint merkle_root,
    // uint verify_time,
    uint256 nullifierHash,
    uint256[8] calldata proof,
    uint salt
  ) public view {
    // check merkle_root valid, and match verify_time

    // now using the latest root
    uint256 merkleTreeDepth = getMerkleTreeDepth(getSbtPoolV2(sbt).id);
    uint256[] memory inputs = new uint256[](3);
    inputs[0] = merkle_root;
    inputs[1] = nullifierHash;
    inputs[2] = salt;
    bool valid = verifiers[merkleTreeDepth].verifyProof(
      [proof[0], proof[1]],
      [[proof[2], proof[3]], [proof[4], proof[5]]],
      [proof[6], proof[7]],
      inputs
    );
    require(valid, "proof invalid!");

  }

  // verify with on-chain latest merkle tree and given salt
  function verifyWithSalt(
    uint sbt,
    uint256 nullifierHash,
    uint256[8] calldata proof,
    uint salt
  ) public {
    uint256 merkleTreeRoot = getMerkleTreeRoot(getSbtPoolV2(sbt).id);
    verifyWithRootAndSalt(sbt, merkleTreeRoot, nullifierHash, proof, salt);
  }

  // verify with on-chain latest merkle tree and on-chain salt
  function verify(
    uint sbt,
    uint256 nullifierHash,
    uint256[8] calldata proof
  ) public {
    uint256 merkleTreeRoot = getMerkleTreeRoot(getSbtPoolV2(sbt).id);
    verifyWithRootAndSalt(sbt, merkleTreeRoot, nullifierHash, proof, getSbtPoolV2(sbt).salt);

    // random change salts[asset][range] to avoid proof conflict
    pools[getSbtMeta(sbt)].salt += 1;
  }

  function setZkSbtAddress(address _newZkSbtAddress) public onlyOwner {
    address oldZkSbtAddress = address(iSbt);
    iSbt = SbtInterface(_newZkSbtAddress);
    emit ZkSbtAddressChange(oldZkSbtAddress, _newZkSbtAddress);
  }
}

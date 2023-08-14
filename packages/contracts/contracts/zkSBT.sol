// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interface/sbt.sol";
import "./spec.sol";
import "./upgradeableLib/Ownable.sol";

interface IVerifier {
  function verifyProof(
    uint256[2] memory a,
    uint256[2][2] memory b,
    uint256[2] memory c,
    uint256[] memory input
  ) external view returns (bool);
}

struct Pool {
  uint id;  // reserve group[id ~ id + offset], sbt capacity 2<<128
  string name;
  uint depth;
  uint salt;
  uint amount;
}

contract Zksbt is SemaphoreGroups, Ownable, Initializable {
  bytes constant public version = "0.5";
  bytes constant ZKSBT_CLAIM_MESSAGE = "Sign this meesage to claim zkSBT : ";
  mapping(uint256 => IVerifier) public verifiers;

  uint public latestStartGroupId;
  uint public groupIdOffset;
  SbtInterface public iSbt;

  // sbt(category, attr) --> pools
  mapping(uint => Pool) public pools;

  // sbt(category, attr) --> public address --> sbt_id
  mapping(uint => mapping(uint => uint)) public sbt_minted;
  event SbtMinted(uint indexed identity, uint sbt);

  // sbt(category, attr) --> public address --> group_id
  mapping(uint => mapping(uint => uint)) public sbt_identity_group;

  event ZkSbtAddressChange(
    address indexed oldAddress,
    address indexed newAddress
  );

  function initialize(
    IVerifier _verifier,
    uint groupDepth,
    SbtInterface _iSbt
  ) external initializer {
    _initOwnable();

    groupIdOffset = SBT_CAPACITY - groupDepth;

    // zksbt verifier
    verifiers[groupDepth] = _verifier;

    // init build-in zksbt pool
    latestStartGroupId = 0;

    _createSbtPool(pompToSbt(uint32(ASSET.ETH), uint32(RANGE.RANGE_100), 0), "POMP-ETH-RANGE_100", groupDepth);
    _createSbtPool(pompToSbt(uint32(ASSET.BNB), uint32(RANGE.RANGE_100), 0), "POMP-BNB-RANGE_100", groupDepth);

    iSbt = _iSbt;
  }


  // TODO: re-entracy control
  function _createSbtPool(
    uint sbt,
    string memory name,
    uint groupDepth
  ) internal returns (uint) {
    _createGroup(latestStartGroupId, groupDepth);
    pools[sbt] = Pool({
      id: latestStartGroupId,
      name: name,
      depth: groupDepth,
      salt:0,
      amount:0
    });
    latestStartGroupId += groupIdOffset;
    return latestStartGroupId;
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
    uint groupDepth
  ) public onlyOwner returns (uint) {
    return _createSbtPool(sbt, name, groupDepth);
  }

  function sbt_claim_message(
    uint identity,
    uint sbt
  ) public pure returns (bytes memory) {
    return bytes.concat(ZKSBT_CLAIM_MESSAGE,
      " identity ",
      bytes(Strings.toString(identity)),
      " sbt category ",
      bytes(Strings.toString(getSbtCategory(sbt))),
      " sbt attribute ",
      bytes(Strings.toString(getSbtAttribute(sbt))),
      " sbt id ",
      bytes(Strings.toString(getSbtId(sbt)))
    );
  }

  function addMember(
    uint sbt,
    uint identity
  ) private {
    Pool storage pool = pools[getSbtMeta(sbt)];
    uint startGroupId = pool.id;
    uint curGroup = startGroupId + pool.amount / (2 << pool.depth);
    if (pool.amount!= 0 && pool.amount % (2 << pool.depth) == 0) {
      // new group
      _createGroup(++curGroup , pool.depth);
    }
    _addMember(curGroup, identity);
    sbt_identity_group[getSbtMeta(sbt)][identity] = curGroup;

    pool.amount++;
  }

  // batch mint
  function mint(
    uint[] calldata identity,
    uint[] calldata sbt,
    bytes[] calldata certificate_signature
  ) public onlyOwner {
    for (uint256 idx = 0; idx < identity.length; idx++) {
      bytes memory message = sbt_claim_message(identity[idx], sbt[idx]);
      bytes32 msgHash = ECDSA.toEthSignedMessageHash(message);
      address signer = ECDSA.recover(msgHash, certificate_signature[idx]);
      require(signer == owner(), "Invalid Certificate Signature!");

      require(sbt_minted[getSbtMeta(sbt[idx])][identity[idx]] == 0, "zksbt exist!");
      addMember(sbt[idx], identity[idx]);
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
    uint groupId,
    uint merkle_root,
    // uint verify_time,
    uint256 nullifierHash,
    uint256[8] calldata proof,
    uint salt
  ) public {
    // check merkle_root valid, and match verify_time

    // now using the latest root
    checkGroupIdInSbtPool(groupId, sbt);
    uint256 merkleTreeDepth = getMerkleTreeDepth(groupId);
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
    uint groupId,
    uint256 nullifierHash,
    uint256[8] calldata proof,
    uint salt
  ) public {
    checkGroupIdInSbtPool(groupId, sbt);
    uint256 merkleTreeRoot = getMerkleTreeRoot(groupId);
    verifyWithRootAndSalt(sbt, groupId, merkleTreeRoot, nullifierHash, proof, salt);
  }

  function checkGroupIdInSbtPool(
    uint groupId,
    uint sbt
  ) public {
    uint groupStartId = getSbtPoolV2(sbt).id;
    require(groupId >= groupStartId, "id too small!");
    require(groupId < groupStartId + groupIdOffset, "id too big!");
  }

  // verify with on-chain latest merkle tree and on-chain salt
  function verify(
    uint sbt,
    uint groupId,
    uint256 nullifierHash,
    uint256[8] calldata proof
  ) public {
    checkGroupIdInSbtPool(groupId, sbt);
    uint256 merkleTreeRoot = getMerkleTreeRoot(groupId);
    verifyWithRootAndSalt(sbt, groupId, merkleTreeRoot, nullifierHash, proof, getSbtPoolV2(sbt).salt);

    // random change salts[asset][range] to avoid proof conflict
    pools[getSbtMeta(sbt)].salt += 1;
  }

  function setZkSbtAddress(address _newZkSbtAddress) public onlyOwner {
    address oldZkSbtAddress = address(iSbt);
    iSbt = SbtInterface(_newZkSbtAddress);
    emit ZkSbtAddressChange(oldZkSbtAddress, _newZkSbtAddress);
  }
}

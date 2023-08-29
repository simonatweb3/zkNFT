// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interface/sbt.sol";
import "./upgradeableLib/Ownable.sol";
import {PoseidonT3} from  "@zk-kit/incremental-merkle-tree.sol/Hashes.sol";

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
  uint amount;
  uint category;
}

struct SbtInfo {
  uint category;
  string attribute;
  uint publicAddress;
  uint id;
  uint verifyTimestamp;
}

contract Zksbt is SemaphoreGroups, Ownable, Initializable {
  bytes constant public VERSION = "0.5";
  uint constant SBT_CAPACITY = 128;
  uint constant SBT_GROUP_GUARANTEE = 16;
  uint constant GROUP_ID_OFFSET = 1 << (SBT_CAPACITY - SBT_GROUP_GUARANTEE);
  bytes constant ZKSBT_CLAIM_MESSAGE = "Sign this meesage to claim zkSBT : ";
  uint constant JUB_CURVE_R = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
  IVerifier public verifier;
  IVerifier public identityVerifier;

  uint public latestStartGroupId;
  SbtInterface public iSbt; // sbt/nft standard style

  // sbt category --> sbt pools
  mapping(uint => Pool) public pools;

  mapping(uint => SbtInfo) public sbt_minted; // sbt_id --> SbtInfo
  mapping(uint => uint) public sbt_group;     // sbt_id --> group id
  event SbtMinted(uint indexed publicAddress, uint category, string attribute, uint id, uint verifyTimestamp);

  mapping(uint => uint) public identity_salt;     // public Address --> salt

  event ZkSbtAddressChange(
    address indexed oldAddress,
    address indexed newAddress
  );

  function initialize(
    IVerifier _verifier,
    IVerifier _identityVerifier,
    SbtInterface _iSbt
  ) external initializer {
    _initOwnable();
    // zksbt verifier
    verifier = _verifier;
    identityVerifier = _identityVerifier;

    // init build-in zksbt pool
    latestStartGroupId = 1;

    iSbt = _iSbt;
  }

  function _addSbt(
    uint category,
    string memory name
  ) internal {
    require(pools[category].id == 0, "sbt pool already exist!");
    _createGroup(latestStartGroupId, SBT_GROUP_GUARANTEE);
    pools[category] = Pool({
      id: latestStartGroupId,
      name: name,
      depth : SBT_GROUP_GUARANTEE,
      amount:0,
      category : category
    });
    latestStartGroupId += GROUP_ID_OFFSET;
  }

  function addSbt(
    uint category,
    string calldata name
  ) public onlyOwner {
    _addSbt(category, name);
  }

  function sbt_claim_message(
    uint publicAddress,
    uint category,
    string memory attribute,
    uint id,
    uint verifyTimestamp
  ) public pure returns (bytes memory) {
    return bytes.concat(ZKSBT_CLAIM_MESSAGE,
      " public address ",
      bytes(Strings.toString(publicAddress)),
      " sbt category ",
      bytes(Strings.toString(category)),
      " sbt attribute ",
      bytes(attribute),
      " sbt id ",
      bytes(Strings.toString(id)),
      " verify timestamp ",
      bytes(Strings.toString(verifyTimestamp))
    );
  }

  function addMember(
    uint category,
    string memory attribute,
    uint publicAddress,
    uint sbtId,
    uint verifyTimestamp
  ) internal returns (uint) {
    if (pools[category].id == 0) {
      _addSbt(category, "");
    }
    Pool storage pool = pools[category];
    uint startGroupId = pool.id;
    uint curGroup = startGroupId + pool.amount / (1 << pool.depth);
    if (pool.amount!= 0 && (pool.amount % (1 << pool.depth) == 0)) {
      // new group
      _createGroup(curGroup , pool.depth);
    }

    uint zksbt_commitment = PoseidonT3.poseidon([publicAddress, sbtId]);
    zksbt_commitment = PoseidonT3.poseidon([zksbt_commitment, sbtId]);
    zksbt_commitment = PoseidonT3.poseidon([zksbt_commitment, uint(keccak256(bytes(attribute))) % JUB_CURVE_R]);
    _addMember(curGroup, zksbt_commitment);

    pool.amount++;
    return curGroup;
  }

  // batch mint
  function mint(
    SbtInfo[] calldata sbtInfo,
    bytes[] calldata signature
  ) public {
    require(sbtInfo.length == signature.length, "sbt/sig len not match!");
    for (uint256 idx = 0; idx < sbtInfo.length; idx++) {
      uint category = sbtInfo[idx].category;
      string memory attribute = sbtInfo[idx].attribute;
      //require(pools[category][attribute].id != 0, "sbt pool not exist!");
      
      uint publicAddress = sbtInfo[idx].publicAddress;
      uint id = sbtInfo[idx].id;
      require(sbt_minted[id].verifyTimestamp == 0, "same zksbt exist!");
  
      uint verifyTimestamp = sbtInfo[idx].verifyTimestamp;
      bytes memory message = sbt_claim_message(
        publicAddress, category, attribute, id, verifyTimestamp
      );
      bytes32 msgHash = ECDSA.toEthSignedMessageHash(message);
      address signer = ECDSA.recover(msgHash, signature[idx]);
      require(signer == owner(), "Invalid Certificate Signature!");

      sbt_minted[id] = SbtInfo({
        category : category,
        attribute : attribute,
        id: id,
        publicAddress : publicAddress,
        verifyTimestamp : verifyTimestamp
      });
      sbt_group[id] = addMember(category, attribute, publicAddress, id, verifyTimestamp);

      bool success = iSbt.mintWithSbtId(publicAddress, category, attribute, id);
      require(success, "failed to mint zkSBT");

      emit SbtMinted(publicAddress, category, attribute, id, verifyTimestamp);
    }
  }

  function verifyIdentity(
    uint identity,
    uint256 nullifierHash,
    uint256[8] calldata proof
  ) public {
    uint256[] memory inputs = new uint256[](3);
    inputs[0] = identity;
    inputs[1] = nullifierHash;
    inputs[2] = identity_salt[identity];
    bool valid = identityVerifier.verifyProof(
      [proof[0], proof[1]],
      [[proof[2], proof[3]], [proof[4], proof[5]]],
      [proof[6], proof[7]],
      inputs
    );
    require(valid, "proof invalid!");
    identity_salt[identity] += 1;
  }

  function verify(
    uint category,
    string memory attribute,
    uint groupId,
    uint merkle_root,
    uint begin_verify_time,
    uint end_verify_time,
    uint salt,
    uint nullifierHash,
    uint[8] calldata proof
  ) public {
    // now using the latest root
    checkGroupIdInSbtPool(groupId, category);
    uint256 merkleTreeDepth = getMerkleTreeDepth(groupId);
    uint256[] memory inputs = new uint256[](6);
    inputs[0] = merkle_root;
    inputs[1] = nullifierHash;
    inputs[2] = salt;
    inputs[3] = uint(keccak256(bytes(attribute))) % JUB_CURVE_R;
    inputs[4] = begin_verify_time;
    inputs[5] = end_verify_time;
    bool valid = verifier.verifyProof(
      [proof[0], proof[1]],
      [[proof[2], proof[3]], [proof[4], proof[5]]],
      [proof[6], proof[7]],
      inputs
    );
    require(valid, "proof invalid!");
  }

  function checkGroupIdInSbtPool(
    uint groupId,
    uint category
  ) public {
    uint groupStartId = pools[category].id;
    require(groupId >= groupStartId, "id too small!");
    require(groupId < groupStartId + GROUP_ID_OFFSET, "id too big!");
  }

  function setZkSbtAddress(address _newZkSbtAddress) public onlyOwner {
    address oldZkSbtAddress = address(iSbt);
    iSbt = SbtInterface(_newZkSbtAddress);
    emit ZkSbtAddressChange(oldZkSbtAddress, _newZkSbtAddress);
  }
}

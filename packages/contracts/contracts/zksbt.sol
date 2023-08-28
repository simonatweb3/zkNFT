// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interface/sbt.sol";
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
  // reserve group[id ~ id + offset], sbt capacity 2<<128
  uint id;
  string name;
  uint depth;
  uint salt;
  uint amount;
  uint category;
  string attribute;
}

contract Zksbt is SemaphoreGroups, Ownable, Initializable {

  bytes constant public VERSION = "0.5";
  uint constant SBT_CAPACITY = 128;
  uint constant SBT_GROUP_GUARANTEE = 32;
  bytes constant ZKSBT_CLAIM_MESSAGE = "Sign this meesage to claim zkSBT : ";
  mapping(uint256 => IVerifier) public verifiers;
  IVerifier public identityVerifier;

  uint public latestStartGroupId;
  uint public groupIdOffset;
  SbtInterface public iSbt; // sbt metadata

  // sbt category --> sbt attribute --> sbt pools
  mapping(uint => mapping(string => Pool)) public pools;

  // sbt category --> sbt attribute --> public address --> sbt_id
  mapping(uint => mapping(string =>  mapping(uint => uint))) public sbt_minted;
  event SbtMinted(uint indexed identity, uint category, string attribute, uint id);

  // sbt category --> sbt attribute --> public address --> group_id
  mapping(uint => mapping(string => mapping(uint => uint))) public sbt_group;

  event ZkSbtAddressChange(
    address indexed oldAddress,
    address indexed newAddress
  );

  function initialize(
    IVerifier _verifier,
    IVerifier _identityVerifier,
    uint groupDepth,
    SbtInterface _iSbt
  ) external initializer {
    _initOwnable();

    groupIdOffset = 1 << (SBT_CAPACITY - groupDepth);

    // zksbt verifier
    verifiers[groupDepth] = _verifier;
    identityVerifier = _identityVerifier;

    // init build-in zksbt pool
    latestStartGroupId = 1;

    // TODO : init pompETH-100, pompBNB-100
    _addSbt(1, "", "ZKBAB", groupDepth);
    _addSbt(2, "", "ZKKYC", groupDepth);
    _addSbt(100, "", "ZKMAIL", groupDepth);
    _addSbt(12, "", "pompETH-0", groupDepth);
    _addSbt(13, "", "pompBNB-0", groupDepth);
    _addSbt(12, "100", "pompETH-100", groupDepth);
    _addSbt(13, "100", "pompBNB-100", groupDepth);

    iSbt = _iSbt;
  }


  function _addSbt(
    uint category,
    string memory attribute,
    string memory name,
    uint groupDepth
  ) internal {
    require(pools[category][attribute].id == 0, "sbt pool already exist!");
    _createGroup(latestStartGroupId, groupDepth);
    pools[category][attribute] = Pool({
      id: latestStartGroupId,
      name: name,
      depth: groupDepth,
      salt:0,
      amount:0,
      category : category,
      attribute : attribute
    });
    latestStartGroupId += groupIdOffset;
  }

  function getSbtPool(
    uint category,
    string memory attribute
  ) public view returns (Pool memory) {
    return pools[category][attribute];
  }

  function addSbt(
    uint category,
    string memory attribute,
    string calldata name
  ) public onlyOwner {
    _addSbt(category, attribute, name, SBT_GROUP_GUARANTEE);
  }

  function sbt_claim_message(
    uint identity,
    uint category,
    string memory attribute,
    uint id
  ) public pure returns (bytes memory) {
    return bytes.concat(ZKSBT_CLAIM_MESSAGE,
      " identity ",
      bytes(Strings.toString(identity)),
      " sbt category ",
      bytes(Strings.toString(category)),
      " sbt attribute ",
      bytes(attribute),
      " sbt id ",
      bytes(Strings.toString(id))
    );
  }

  function addMember(
    uint category,
    string memory attribute,
    uint identity
  ) internal {
    Pool storage pool = pools[category][attribute];
    uint startGroupId = pool.id;
    uint curGroup = startGroupId + pool.amount / (1 << pool.depth);
    if (pool.amount!= 0 && (pool.amount % (1 << pool.depth) == 0)) {
      // new group
      _createGroup(curGroup , pool.depth);
    }
    _addMember(curGroup, identity);
    sbt_group[category][attribute][identity] = curGroup;

    pool.amount++;
  }

  // batch mint
  function mint(
    uint[] calldata identity,
    uint[] calldata category,
    string[] calldata attribute,
    uint[] calldata ids,
    bytes[] calldata certificate_signature
  ) public {
    for (uint256 idx = 0; idx < identity.length; idx++) {
      uint identity = identity[idx];
      uint category = category[idx];
      string memory attribute = attribute[idx];
      require(pools[category][attribute].id != 0, "sbt pool not exist!");
      uint id = ids[idx];
      bytes memory message = sbt_claim_message(identity, category, attribute, id);
      bytes32 msgHash = ECDSA.toEthSignedMessageHash(message);
      address signer = ECDSA.recover(msgHash, certificate_signature[idx]);
      require(signer == owner(), "Invalid Certificate Signature!");

      // TODO : close for test easy, should enable
      // require(sbt_minted[category][attribute][identity] == 0, "zksbt exist!");

      addMember(category, attribute, identity);
      sbt_minted[category][attribute][identity] = id;

      bool success = iSbt.mintWithSbtId(identity, category, attribute, id);
      require(success, "failed to mint zkSBT");

      emit SbtMinted(identity, category, attribute, id);
    }
  }

  function verifyIdentity(
    uint identity,
    uint256 nullifierHash,
    uint256[8] calldata proof,
    uint salt
  ) public {
    uint256[] memory inputs = new uint256[](3);
    inputs[0] = identity;
    inputs[1] = nullifierHash;
    inputs[2] = salt;
    bool valid = identityVerifier.verifyProof(
      [proof[0], proof[1]],
      [[proof[2], proof[3]], [proof[4], proof[5]]],
      [proof[6], proof[7]],
      inputs
    );
    require(valid, "proof invalid!");
  }

  // verify with given merkle root and given salt
  function verifyWithRootAndSalt(
    uint category,
    string memory attribute,
    uint groupId,
    uint merkle_root,
    // uint verify_time,
    uint256 nullifierHash,
    uint256[8] calldata proof,
    uint salt
  ) public {
    // check merkle_root valid, and match verify_time

    // now using the latest root
    checkGroupIdInSbtPool(groupId, category, attribute);
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
    uint category,
    string memory attribute,
    uint groupId,
    uint256 nullifierHash,
    uint256[8] calldata proof,
    uint salt
  ) public {
    checkGroupIdInSbtPool(groupId, category, attribute);
    uint256 merkleTreeRoot = getMerkleTreeRoot(groupId);
    verifyWithRootAndSalt(category, attribute, groupId, merkleTreeRoot, nullifierHash, proof, salt);
  }

  function checkGroupIdInSbtPool(
    uint groupId,
    uint category,
    string memory attribute
  ) public {
    uint groupStartId = getSbtPool(category, attribute).id;
    require(groupId >= groupStartId, "id too small!");
    require(groupId < groupStartId + groupIdOffset, "id too big!");
  }

  // verify with on-chain latest merkle tree and on-chain salt
  function verify(
    uint category,
    string memory attribute,
    uint groupId,
    uint256 nullifierHash,
    uint256[8] calldata proof
  ) public {
    checkGroupIdInSbtPool(groupId, category, attribute);
    uint256 merkleTreeRoot = getMerkleTreeRoot(groupId);
    verifyWithRootAndSalt(
      category, attribute, groupId, merkleTreeRoot, nullifierHash,
      proof, getSbtPool(category, attribute).salt
    );

    // random change salts[asset][range] to avoid proof conflict
    pools[category][attribute].salt += 1;
  }

  function setZkSbtAddress(address _newZkSbtAddress) public onlyOwner {
    address oldZkSbtAddress = address(iSbt);
    iSbt = SbtInterface(_newZkSbtAddress);
    emit ZkSbtAddressChange(oldZkSbtAddress, _newZkSbtAddress);
  }
}

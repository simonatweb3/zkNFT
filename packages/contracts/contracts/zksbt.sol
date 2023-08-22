// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interface/sbt.sol";
import "./upgradeableLib/Ownable.sol";
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
  uint id;  // reserve group[id ~ id + offset], sbt capacity 2<<128
  string name;
  uint depth;
  uint salt;
  uint amount;
}

contract Zksbt is SemaphoreGroups, Ownable, Initializable {

  bytes constant public VERSION = "0.5";
  uint constant SBT_CAPACITY = 128;
  uint constant SBT_GROUP_GUARANTEE = 16;
  bytes constant ZKSBT_CLAIM_MESSAGE = "Sign this meesage to claim zkSBT : ";
  mapping(uint256 => IVerifier) public verifiers;

  uint public latestStartGroupId;
  uint public groupIdOffset;
  SbtInterface public iSbt; // sbt metadata

  // sbt category --> sbt attribute --> sbt pools
  mapping(uint => mapping(uint => Pool)) public pools;

  // sbt category --> sbt attribute --> public address --> sbt_id
  mapping(uint => mapping(uint =>  mapping(uint => uint))) public sbt_minted;
  event SbtMinted(uint indexed identity, uint category, uint attribute, uint id);

  // sbt category --> sbt attribute --> public address --> group_id
  mapping(uint => mapping(uint => mapping(uint => uint))) public sbt_group;

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

    groupIdOffset = 1 << (SBT_CAPACITY - groupDepth);

    // zksbt verifier
    verifiers[groupDepth] = _verifier;

    // init build-in zksbt pool
    latestStartGroupId = 1;

    // TODO : init pompETH-100, pompBNB-100
    _createSbtPool(1, 0, "ZKBAB", groupDepth);
    _createSbtPool(2, 0, "ZKKYC", groupDepth);
    _createSbtPool(12, 0, "pompETH-0", groupDepth);
    _createSbtPool(13, 0, "pompBNB-0", groupDepth);
    _createSbtPool(12, 100, "pompETH-100", groupDepth);
    _createSbtPool(13, 100, "pompBNB-100", groupDepth);

    iSbt = _iSbt;
  }


  function _createSbtPool(
    uint category,
    uint attribute,
    string memory name,
    uint groupDepth
  ) internal {
    console.log("sol add new group ", latestStartGroupId);
    _createGroup(latestStartGroupId, groupDepth);
    pools[category][attribute] = Pool({
      id: latestStartGroupId,
      name: name,
      depth: groupDepth,
      salt:0,
      amount:0
    });
    latestStartGroupId += groupIdOffset;
  }

  function getSbtPool(
    uint category,
    uint attribute
  ) public view returns (Pool memory) {
    return pools[category][attribute];
  }

  function createSbtPool(
    uint category,
    uint attribute,
    string calldata name,
    uint groupDepth
  ) public onlyOwner {
    _createSbtPool(category, attribute, name, groupDepth);
  }

  function addSbt(
    uint category,
    uint attribute,
    string calldata name
  ) public onlyOwner {
    createSbtPool(category, attribute, name, SBT_GROUP_GUARANTEE);
  }

  function sbt_claim_message(
    uint identity,
    uint category,
    uint attribute,
    uint id
  ) public pure returns (bytes memory) {
    return bytes.concat(ZKSBT_CLAIM_MESSAGE,
      " identity ",
      bytes(Strings.toString(identity)),
      " sbt category ",
      bytes(Strings.toString(category)),
      " sbt attribute ",
      bytes(Strings.toString(attribute)),
      " sbt id ",
      bytes(Strings.toString(id))
    );
  }

  function addMember(
    uint category,
    uint attribute,
    uint identity
  ) private {
    Pool storage pool = pools[category][attribute];
    uint startGroupId = pool.id;
    uint curGroup = startGroupId + pool.amount / (1 << pool.depth);
    if (pool.amount!= 0 && (pool.amount % (1 << pool.depth) == 0)) {
      // new group
      console.log("sol add new group ", curGroup);
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
    uint[] calldata attribute,
    uint[] calldata ids,
    bytes[] calldata certificate_signature
  ) public onlyOwner {
    for (uint256 idx = 0; idx < identity.length; idx++) {
      uint identity = identity[idx];
      uint category = category[idx];
      uint attribute = attribute[idx];
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
      // console.log("sol category ", category, " attribute ", attribute);
      // console.log("identity ", identity, "id ", id);

      bool success = iSbt.mintWithSbtId(identity, category, attribute, id);
      require(success, "failed to mint zkSBT");

      emit SbtMinted(identity, category, attribute, id);
    }
  }

  // verify with given merkle root and given salt
  function verifyWithRootAndSalt(
    uint category,
    uint attribute,
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
    uint attribute,
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
    uint attribute
  ) public {
    uint groupStartId = getSbtPool(category, attribute).id;
    require(groupId >= groupStartId, "id too small!");
    require(groupId < groupStartId + groupIdOffset, "id too big!");
  }

  // verify with on-chain latest merkle tree and on-chain salt
  function verify(
    uint category,
    uint attribute,
    uint groupId,
    uint256 nullifierHash,
    uint256[8] calldata proof
  ) public {
    checkGroupIdInSbtPool(groupId, category, attribute);
    uint256 merkleTreeRoot = getMerkleTreeRoot(groupId);
    verifyWithRootAndSalt(category, attribute, groupId, merkleTreeRoot, nullifierHash, proof, getSbtPool(category, attribute).salt);

    // random change salts[asset][range] to avoid proof conflict
    pools[category][attribute].salt += 1;
  }

  function setZkSbtAddress(address _newZkSbtAddress) public onlyOwner {
    address oldZkSbtAddress = address(iSbt);
    iSbt = SbtInterface(_newZkSbtAddress);
    emit ZkSbtAddressChange(oldZkSbtAddress, _newZkSbtAddress);
  }
}

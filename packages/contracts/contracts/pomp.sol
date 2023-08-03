// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@semaphore-protocol/contracts/base/SemaphoreGroups.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interface/zkSbtInterface.sol";

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
  uint depth;
}

contract Pomp is SemaphoreGroups, Ownable {
  uint constant POMP_POOL_DEPTH = 10;
  uint public latestPoolId;
  ZkSbtInterface public ZkSbt;

  enum ASSET {
    ETH,
    BNB
    // upgradeable
  }

  enum RANGE {
    RANGE_0, // >0, ignore?
    RANGE_1_10, // 1~10
    RANGE_10_100, // 10~100
    RANGE_100 // >100
  }

  // asset_type --> asset_range --> pools)
  mapping(uint => mapping(uint => Pool)) public pools;

  // external nullifier, increase per verify
  mapping(uint => mapping(uint => uint)) public salts; // random?
  mapping(uint => bool) public nullifierHashes;

  mapping(uint256 => IVerifier) public verifiers;

  event SbtMinted(uint indexed identity, uint asset, uint range, uint sbtId);

  event ZkSbtAddressChange(
    address indexed oldAddress,
    address indexed newAddress
  );

  mapping(uint => mapping(uint => mapping(uint => bool))) public sbt_minted;

  constructor(IVerifier _verifier, uint poolDepth, ZkSbtInterface _ZkSbt) Ownable() {
    // pomp verifier
    verifiers[poolDepth] = _verifier;

    // init build-in pomp pool
    latestPoolId = 0;
    createPompPool(uint(ASSET.ETH), uint(RANGE.RANGE_100), poolDepth);
    createPompPool(uint(ASSET.BNB), uint(RANGE.RANGE_100), poolDepth);

    ZkSbt = _ZkSbt;
  }

  function createPompPool(uint asset, uint range, uint poolDepth) internal {
    _createGroup(latestPoolId, poolDepth);
    pools[asset][range] = Pool({id: latestPoolId++, depth: poolDepth});
  }

  function addAsset(
    address token
  )
    public
    // range list
    onlyOwner
  {}

  // batch mint
  function mint(
    uint[] calldata identity,
    uint asset,
    uint range,
    uint[] calldata sbtId
    //bytes[] calldata certificate_signature
  ) public onlyOwner {    
    for (uint256 idx = 0; idx < identity.length; idx++) {
      // verify server's signature.
      // bytes memory message = bytes.concat(
      //   "\x19Ethereum Signed Message:\n130",  // 10-th 130
      //   "0x",
      //   Bytes.bytesToHexASCIIBytes(orig_msg)
      // );
      // address signer = ECDSA.recover(keccak256(message), certificate_signature[idx]);
      // require(signer == owner, "Invalid Certificate Signature!");

      _addMember(pools[asset][range].id, identity[idx]);

      sbt_minted[asset][range][identity[idx]] = true;

      bool success = ZkSbt.mintWithSbtId(identity[idx], asset, range, sbtId[idx]);
      require(success, "failed to mint zkSBT");

      emit SbtMinted(identity[idx], asset, range, sbtId[idx]);
    }
  }

  function verify(
    uint asset,
    uint range,
    // uint merkle_root,
    // uint verify_time,
    uint256 nullifierHash,
    uint256[8] calldata proof
  ) public {
    // check merkle_root match verify_time

    // now using the latest root
    uint256 merkleTreeDepth = getMerkleTreeDepth(pools[asset][range].id);
    uint256 merkleTreeRoot = getMerkleTreeRoot(pools[asset][range].id);
    uint256[] memory inputs = new uint256[](3);
    inputs[0] = merkleTreeRoot;
    inputs[1] = nullifierHash;
    inputs[2] = salts[asset][range];
    bool valid = verifiers[merkleTreeDepth].verifyProof(
      [proof[0], proof[1]],
      [[proof[2], proof[3]], [proof[4], proof[5]]],
      [proof[6], proof[7]],
      inputs
    );
    require(valid, "proof invalid!");

    // random change salts[asset][range]?
  }

  function setZkSbtAddress(address _newZkSbtAddress) public onlyOwner {
    address oldZkSbtAddress = address(ZkSbt);
    ZkSbt = ZkSbtInterface(_newZkSbtAddress);
    emit ZkSbtAddressChange(oldZkSbtAddress, _newZkSbtAddress);
  }
}

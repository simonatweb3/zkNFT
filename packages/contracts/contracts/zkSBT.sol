// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZkSBT is ERC721URIStorage, Ownable {
  // operators allowed to mint SBT
  mapping(address => bool) public operators;

  // sbt tokenId => sbt's metaData
  mapping(uint256 => MetaData) public sbtMetaData;

  // zkAddress => identityCommitment, to check potential collision
  mapping(address => uint256) public zkAddressPreImage;

  // address of pomp, stores corresponding Merkle tree;
  address public pomp;

  string public baseUri;

  event OperatorChange(address indexed _operator, bool indexed _allowed);

  event MintIdStatusChange(uint256 indexed _mintId, bool indexed _open);

  event MintZkSBT(
    uint256 indexed _identityCommitment,
    uint256 indexed asset,
    uint256 range,
    uint256 indexed tokenId
  );

  modifier onlyOperator() {
    require(
      operators[msg.sender] || msg.sender == owner(),
      "caller is not operator"
    );
    _;
  }

  // metadata of SBT
  struct MetaData {
    uint256 asset; // used to distinguish different asset
    uint256 range;
  }

  constructor(address _pomp) ERC721("ZkSBT", "ZkSBT") {
    pomp = _pomp;
  }

  // override _transfer to prevent SBT from being transferred
  function _transfer(
    address from,
    address to,
    uint256 tokenId
  ) internal pure override {
    from;
    to;
    tokenId;
    revert("SBT can't be transferred");
  }

  function mintWithSbtId(
    uint256 identityCommitment, //record identity commitment of user
    uint256 asset, //asset type, which is enumeration
    uint256 range,
    uint256 sbtId //sbt id in the per sbt identity
  ) public onlyOperator returns (bool) {
    // check identityCommitment is not 0
    require(identityCommitment != 0, "invalid identityCommitment");

    // the tokenId to be minted i sbtId
    uint256 tokenId = sbtId;

    // generate zk address from identityCommitment
    address zkAddress = address(uint160(identityCommitment));

    // check availability of zkAddress
    checkZkAddressAvailabilty(zkAddress, identityCommitment);

    // mint sbt
    _safeMint(zkAddress, tokenId);

    sbtMetaData[tokenId] = MetaData(asset, range);

    emit MintZkSBT(identityCommitment, asset, range, tokenId);
    return true;
  }

  // check whether zkAddresses have collision
  function checkZkAddressAvailabilty(
    address zkAddress,
    uint256 identityCommitment
  ) internal returns (bool) {
    uint256 preimage = zkAddressPreImage[zkAddress];
    if (preimage == 0) {
      zkAddressPreImage[zkAddress] = identityCommitment;
    } else {
      require(identityCommitment == preimage, "collision of zkAddress");
    }

    return true;
  }

  /**
   * @dev Approve `operator` to mint zkSBT
   *
   * Emits an {ApprovalForAll} event.
   */
  function setOperator(
    address operator,
    bool approved
  ) public virtual onlyOwner {
    operators[operator] = approved;
    emit OperatorChange(operator, approved);
  }

  /**
   * @dev Base URI for computing {tokenURI}.
   */
  function _baseURI() internal view override returns (string memory) {
    return baseUri;
  }

  /**
   * @dev set base Uri
   */
  function setBaseUri(
    string memory _baseUri
  ) external onlyOperator returns (bool) {
    baseUri = _baseUri;
    return true;
  }
}

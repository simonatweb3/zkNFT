// contracts/GameItem.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZkSBT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // single reserve for one address
    uint256 public mintsPerReserve;

    // operators allowed to mint SBT
    mapping(address => bool) public operators;

    // sbt tokenId => sbt's metaData
    mapping(uint256 => MetaData) public sbtMetaData;

    // mintId status
    mapping(uint256 => bool) public mintIdStatus;

    // mintId => baseUrl
    mapping(uint256 => string) public sbtBatchBaseUrl;

    // zkAddress => identityCommitment, to check potential collision
    mapping(address => uint256) public zkAddressPreImage;

    // address of pomp, stores corresponding Merkle tree;
    address public pomp;

    string public baseUri;

    event OperatorChange(address indexed _operator, bool indexed _allowed);

    event MintIdStatusChange(uint256 indexed _mintId, bool indexed _open);

    event MintZkSBT(
        uint256 indexed _identityCommitment,
        uint256 indexed _mintId,
        uint256 indexed _chainId,
        address _assetContractAddress,
        uint256 _assetTokenId,
        RANGE range,
        bytes data
    );

    modifier onlyOperator() {
        require(
            operators[msg.sender] || msg.sender == owner(),
            "caller is not operator"
        );
        _;
    }

    // asset amount range
    enum RANGE {
        RANGE_0, // >0
        RANGE_1_10, // 1~10
        RANGE_10_100, // 10~100
        RANGE_100 // >100
    }

    // metadata of SBT
    struct MetaData {
        // used to distinguish different mint batch
        uint256 mintId;
        uint256 chainId;
        address assetContractAddress;
        uint256 assetTokenId;
        RANGE range;
        bytes data;
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
        uint256 mintId, //mint id
        uint256 chainId, // chainId of the asset
        address assetContractAddress, //asset contract address
        uint256 assetTokenId, //asset token id
        uint256 sbtId, //sbt id in the per sbt identity
        RANGE range,
        bytes memory data
    ) public onlyOperator {
        // check identityCommitment is not 0
        require(identityCommitment != 0, "invalid identityCommitment");

        // check mintId is open
        require(mintIdStatus[mintId], "mintId not available");

        // the tokenId to be minted i sbtId
        uint256 tokenId = sbtId;

        // generate zk address from identityCommitment
        address zkAddress = address(uint160(identityCommitment));

        // check availability of zkAddress
        checkZkAddressAvailabilty(zkAddress, identityCommitment);

        // mint sbt
        _safeMint(zkAddress, tokenId);

        sbtMetaData[tokenId] = MetaData(
            mintId,
            chainId,
            assetContractAddress,
            assetTokenId,
            range,
            data
        );

        emit MintZkSBT(
            identityCommitment,
            mintId,
            chainId,
            assetContractAddress,
            tokenId,
            range,
            data
        );
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
     * @dev set status of mintId
     *
     * Emits an {ApprovalForAll} event.
     */
    function setMintIdStatus(
        uint256 _mintId,
        bool _open
    ) public virtual onlyOperator {
        mintIdStatus[_mintId] = _open;
        emit MintIdStatusChange(_mintId, _open);
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

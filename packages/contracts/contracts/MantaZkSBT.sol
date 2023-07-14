// contracts/GameItem.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Events.sol";

contract ZkSBT is ERC721URIStorage, Ownable, Events {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // single reserve for one address
    uint256 public mintsPerReserve;

    // operators allowed to mint SBT
    mapping(address => bool) public operators;

    // stores allowed assetId:  [start id , end id]
    mapping(address => uint256[2]) public allowedAssetIds;

    // sbt tokenId => sbt's metaData
    mapping(uint256 => MetaData) public sbtMetaData;

    // mintId status
    mapping(uint256 => bool) public mintIdStatus;

    // mintId => baseUrl
    mapping(uint256 => string) public sbtBatchBaseUrl;

    // address of pomp, stores corresponding Merkle tree;
    address public pomp;

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner());
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
    }

    constructor(address _pomp) ERC721("ZkSBT", "ZkSBT") {
        pomp = _pomp;
    }

    function safeMint(address to) public onlyOperator {
        uint256 tokenId = _tokenIds.current();
        _tokenIds.increment();
        _safeMint(to, tokenId);
    }

    function mintWithReservedId(
        uint256 identityCommitment, //record identity commitment of user
        uint256 mintId, //mint id
        uint256 chainId, // chainId of the asset
        address assetContractAddress, //asset contract address
        uint256 assetTokenId, //asset token id
        uint256 sbtId, //sbt id in the per sbt identity
        RANGE range
    ) public onlyOperator {
        require(identityCommitment != address(0), "invalid identityCommitment");
        require(mintIdStatus[mintId], "mintId not available");

        (uint256 _startId, uint256 _endId) = allowedAssetIds[
            identityCommitment
        ];

        require(_endId != 0 && _startId < _endId, "assetId not reserved");

        if (_startId == _endId - 1) {
            delete allowedAssetIds[identityCommitment];
        }

        uint256 tokenId = _startId;
        require(sbtId == tokenId, "Invalid sbtId");
        _safeMint(identityCommitment, tokenId);

        sbtMetaData[tokenId] = MetaData(
            mintId,
            chainId,
            assetContractAddress,
            assetTokenId,
            range
        );
    }

    /**
     * @dev Approve `operator` to mint zkSBT
     *
     * Emits an {ApprovalForAll} event.
     */
    function setOperator(
        address operator,
        bool approved
    ) internal virtual onlyOwner {
        operators[operator] = approved;
        emit OperatorChange(operator, approved);
    }

    /**
     * @dev set status of mintId
     *
     * Emits an {ApprovalForAll} event.
     */
    function setOperator(
        uint256 _mintId,
        bool _open
    ) internal virtual onlyOperator {
        mintIdStatus[_mintId] = _open;
        emit MintIdStatusChange(_mintId, _open);
    }

    /**
     * @dev reserve SBT ids for user
     *
     * Emits an {ReserveSBT} event.
     */
    function reserve_sbt(address _to) internal virtual onlyOperator {
        require(mintsPerReserve > 0, "invalid mintsPerReserve");

        uint256 _startId = _tokenIds.current();

        for (uint256 i = 0; i < mintsPerReserve; i++) {
            _tokenIds.increment();
        }

        uint256 _endId = _startId + mintsPerReserve;

        allowedAssetIds[_to] = [_startId, _endId];

        emit ReserveSBT(_to, _startId, _endId);
    }
}

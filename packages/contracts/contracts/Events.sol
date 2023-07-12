// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

contract Events {
    event OperatorChange(address indexed _operator, bool indexed _allowed);
    event ReserveSBT(
        address indexed _to,
        uint256 indexed _startId,
        uint256 indexed _endId
    );
    event MintIdStatusChange(uint256 indexed _mintId, bool indexed _open);
}

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

contract Events {
    event OperatorChange(address indexed _operator, bool indexed _allowed);

    event MintIdStatusChange(uint256 indexed _mintId, bool indexed _open);
}

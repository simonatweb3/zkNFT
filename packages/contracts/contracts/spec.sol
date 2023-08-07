// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

struct Sbt {
  uint64 category;
  uint64 attribute;
  uint128 id;
}

function getSbtMeta(uint256 sbt) pure returns (uint128) {
    return uint128(sbt >> 128);
}

function getSbtCategory(uint256 sbt) pure returns (uint64) {
    return uint64(sbt >> (128 + 64));
}

function getSbtAttribute(uint256 sbt) pure returns (uint64) {
    return uint64(uint128(sbt >> 128) & uint128(0xFFFFFFFFFFFFFFFF));
}

function getSbtId(uint256 sbt) pure returns (uint128) {
    return uint128(sbt & uint(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF));
}

enum SBT_CATEGORY {
  ZKBAB,
  ZKBURGER,
  POMP
}

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

function normalizeSbt(
  uint64 category,
  uint64 attribute,
  uint128 id
) pure returns (uint) {
  return uint(category) << (64 + 128) + uint(attribute) << 128 + id;
}



function pompToSbt(
  uint32 asset,
  uint32 range,
  uint128 id
) pure returns (uint) {
  uint64 attribute = asset << 32 + range;
  return normalizeSbt(uint64(SBT_CATEGORY.POMP), attribute, id);
}


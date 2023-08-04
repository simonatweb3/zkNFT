export type FileType = any;
export const ZKSBT_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";
export const ZKSBT_CLAIM_MESSAGE = "Sign this message to claim your zkSBT : "
export const TREE_DEPTH = 10

export enum SBT_TYPE {
  ZKBAB = 0,
  ZKBURGER = 1,
  POMP = 2
}

export enum ASSET {
  ETH = 0,
  BNB = 1
  // upgradeable
}

export enum RANGE {
    RANGE_0 = 0,       // >0, ignore?
    RANGE_1_10 = 1,    // 1~10
    RANGE_10_100 = 2,  // 10~100
    RANGE_100 = 3     // >100
}

// TODO : SBT Spec
export interface SBT {
  type  : SBT_TYPE;   // mintId --> name/address
  asset : number;
  range : number;
}

export function pomp2sbt(
  asset : number,
  range : number
//) : bigint {
  //return (BigInt(asset) << 20n) || (BigInt(range) & BigInt(2 ** 20 - 1))
) : SBT {
  return {type : SBT_TYPE.POMP, asset : asset, range : range}
}

export const ZKSBT_CERT_SIGN_MESSAGE = "$identity $sbt_name ... $asset $range"


export function claim_sbt_message(
  publicAddress : string,
  sbt : SBT
) {
  let SBT_CLAIM_MESSAGE = ZKSBT_CLAIM_MESSAGE
  SBT_CLAIM_MESSAGE += " identity " + publicAddress.toString()
  SBT_CLAIM_MESSAGE += " sbt type id " + sbt.type.toString()
  SBT_CLAIM_MESSAGE += " asset type id " + sbt.asset.toString()
  SBT_CLAIM_MESSAGE += " range type id " + sbt.range.toString()
  console.log("claim_sbt_message : ", SBT_CLAIM_MESSAGE)
  return SBT_CLAIM_MESSAGE
}
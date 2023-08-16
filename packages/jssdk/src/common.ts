export type FileType = any;
export const ZKSBT_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";
export const ZKSBT_CLAIM_MSG = "Sign this meesage to claim zkSBT : "
export const TREE_DEPTH = 10
export const REVERT_REASON_HEADER = "VM Exception while processing transaction: reverted with reason string "
export const REVERT_REASON_ALREADY_MINT_SBT = REVERT_REASON_HEADER + "\'" + "zksbt exist!" + "\'"

export enum SBT_CATEGORY {    // same as mint ID
  ZKBAB = 1,
  ZKKYC = 2,
  pompETH = 12,
  pompBNB = 13
}

export enum POMP_RANGE {
  RANGE_0 = 0,
  RANGE_1 = 1,
  RANGE_10 = 10,
  RANGE_100 = 100
}

export function claim_msg(
  publicAddress : string,
  category : bigint,
  attribute : bigint
) {
  let SBT_CLAIM_MSG = ZKSBT_CLAIM_MSG
  SBT_CLAIM_MSG += " identity " + publicAddress.toString()
  SBT_CLAIM_MSG += " sbt category " + category.toString()
  SBT_CLAIM_MSG += " sbt attribute " + attribute.toString()
  console.log("sbt.claim_message : ", SBT_CLAIM_MSG)
  return SBT_CLAIM_MSG
}

export function certi_msg(
  publicAddress : string,
  category : bigint,
  attribute : bigint,
  id : bigint
) {
  const SBT_CERTI_MSG = claim_msg(publicAddress, category, attribute) + " sbt id " + id.toString()
  console.log("SBT_CERTI_MSG : ", SBT_CERTI_MSG)
  return SBT_CERTI_MSG
}
import bigInt from 'big-integer';

export type FileType = any;
export const ZKSBT_KEY_SIGN_MESSAGE =
  "Sign this message to generate your Pomp Privacy Key. This key lets the application decrypt your identity on Pomp.\n\nIMPORTANT: Only sign this message if you trust the application.";
export const ZKSBT_CLAIM_MSG = "Sign this meesage to claim zkSBT : "
export const TREE_DEPTH = 10

export enum SBT_CATEGORY {
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
// 256bit : | sbt_category(64) | sbt_attribute(64) | sbt_id(128) |
// pomp :   |        2     |   0       3        |  5678       |
export class SBT {
  category  : SBT_CATEGORY;   // mintId --> name/address
  attribute : bigint;      // [category, attribute] --> pool on-chain
  id : bigint;
  // asset : number | undefined;
  // range : number | undefined;

  constructor(
    category : SBT_CATEGORY,
    attribute : bigint
  ) {
    this.category = category
    this.attribute = attribute
    this.id = BigInt(0)
  }

  public setId(
    id : bigint
  ) {
    this.id = id
  }

  public static create(
    category : SBT_CATEGORY
  ) {
    return new SBT(category, BigInt(0))
  }

  public static createPomp(
    asset : number,
    range : number
  ) {
    // pomp attribute(64) = asset(32) + range(32)
    const attribute = BigInt(asset * Math.pow(2, 32) + range);
    return new SBT(SBT_CATEGORY.POMP, attribute)
  }

  public metaData() {
    //const meta_data = BigInt(this.category * Math.pow(2, 128+64)) + this.attribute * BigInt(Math.pow(2, 128))
    const meta_data = BigInt(this.category * Math.pow(2, 64)) + this.attribute
    //console.log("js meta_data : ", meta_data)
    return meta_data
  }

  public normalize() {
    return this.metaData() * BigInt(Math.pow(2, 128)) + BigInt(this.id)
  }

  public static getMetaData(sbt : BigInt) {
    return bigInt(sbt.toString()).shiftRight(128)
  }

  public claim_msg(
    publicAddress : string
  ) {
    let SBT_CLAIM_MSG = ZKSBT_CLAIM_MSG
    SBT_CLAIM_MSG += " identity " + publicAddress.toString()
    SBT_CLAIM_MSG += " sbt category " + this.category.toString()
    SBT_CLAIM_MSG += " sbt attribute " + this.attribute.toString()
    console.log("sbt.claim_message : ", SBT_CLAIM_MSG)
    return SBT_CLAIM_MSG
  }

  public certi_msg(
    publicAddress : string,
    sbt_id : string
  ) {
    const SBT_CERTI_MSG = this.claim_msg(publicAddress) + " sbt id " + sbt_id.toString()
    console.log("SBT_CERTI_MSG : ", SBT_CERTI_MSG)
    return SBT_CERTI_MSG
  }

}
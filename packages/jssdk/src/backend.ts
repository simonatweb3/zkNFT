import {ethers, Signer} from "ethers"
import { claim_sbt_message, ZKSBT_KEY_SIGN_MESSAGE, SBT, certificate_sbt_message } from "./common";

interface IBackend {
  //is_eligible : () => boolean
  // allocate_asset_id
}
export class Backend implements IBackend {

  signer: Signer;
  constructor(
    signer : Signer
  ) {
    this.signer = signer
  }

  public is_eligible(
    sbt : SBT
  ) {
    // TODO : check 
    return true
  }

  // TODO : backend reserve the asset id in DB
  public allocate_asset_id(sbt : SBT) : bigint {
    return BigInt(5678);
    //return BigInt(Math.floor(Math.random() * Math.pow(2, 32)))
  }

  public async certificate(
    publicAddress : bigint,
    sbt : SBT,
    sig : string
  ) {
    const privateAddress = ethers.utils.verifyMessage(
      claim_sbt_message(publicAddress.toString(), sbt),
      sig
    )

    // TODO : check privateAddress is eligble to sbt
    // return {eligble : false, } if not eligble

    // allocate sbt_id
    const sbt_id = this.allocate_asset_id(sbt)

    // server signature(publicAddress, sbt)
    const certificate_signature = await this.signer.signMessage(
      certificate_sbt_message(publicAddress.toString(), sbt, sbt_id.toString())
    );
    return {
      eligible : true,
      signature : certificate_signature,
      sbt_id : sbt_id
    }
  }

  public async set_proof_key(
    publicAddress : bigint,
    sbt : SBT,
    proof : string
  ) {
    // verify p
  }
}
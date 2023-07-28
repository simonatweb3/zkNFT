import {ethers, Signer} from "ethers"
import { claim_sbt_message, POMP_KEY_SIGN_MESSAGE, SBT } from "./common";

interface IBackend {
  //is_eligible : () => boolean
  // allocate_asset_id
}
export class PompBackend implements IBackend {

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

  // TODO : get the allocated asset_id from backend/on-chain contract
  public allocate_asset_id(sbt : SBT) : bigint {
    return BigInt(5678);
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


    // server signature(publicAddress, sbt)
    const certificate_signature = await this.signer.signMessage(
      claim_sbt_message(publicAddress.toString(), sbt)
    );
    return {
      eligible : true,
      signature : certificate_signature
    }
  }
}
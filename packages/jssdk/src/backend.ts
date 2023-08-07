import {Contract, ethers, Signer} from "ethers"
import {Proof } from "@semaphore-protocol/proof"
import { FileType, SBT} from "./common";
import zksbtJson from "./ABI/Zksbt.json"

interface IBackend {
  check_eligible : (privateAddress : string, sbt : SBT) => boolean;
  allocate_asset_id : (sbt : SBT) => bigint;
  certificate : (publicAddress: bigint, sbt : SBT, sig : string) => 
    Promise<{ eligible: boolean; signature: string; sbt_id: bigint; }>
  generate_proof_key : (publicAddress : bigint, sbt : SBT, proof : Proof) => Promise<string>;
}
export class Backend implements IBackend {
  pc: Contract;
  signer: Signer;
  zksbt_wasm: FileType;
  zksbt_zkey: FileType;

  constructor(
    zksbtContract: string,
    signer : Signer,
    zksbt_wasm: FileType,
    zksbt_zkey: FileType,
  ) {
    this.signer = signer
    this.pc = new ethers.Contract(zksbtContract, zksbtJson.abi, signer);
    this.zksbt_wasm = zksbt_wasm;
    this.zksbt_zkey = zksbt_zkey
  }

  public check_eligible(
    privateAddress : string,
    sbt : SBT
  ) : boolean {
    // TODO
    return true
  }

  public allocate_asset_id(sbt : SBT) : bigint {
    // TODO
    return BigInt(5678);
    //return BigInt(Math.floor(Math.random() * Math.pow(2, 32)))
  }

  public async certificate(
    publicAddress : bigint,
    sbt : SBT,
    sig : string
  ) {
    const privateAddress = ethers.utils.verifyMessage(
      sbt.claim_msg(publicAddress.toString()),
      sig
    )

    if (!this.check_eligible(privateAddress, sbt)) {
      return {
        eligible : false,
        signature : "",
        sbt_id : BigInt(0)
      }
    }

    // allocate sbt_id
    const sbt_id = this.allocate_asset_id(sbt)

    // server signature(publicAddress, sbt)
    const certificate_signature = await this.signer.signMessage(
      sbt.certi_msg(publicAddress.toString(), sbt_id.toString())
    );
    return {
      eligible : true,
      signature : certificate_signature,
      sbt_id : sbt_id
    }
  }

  public async generate_proof_key(
    publicAddress : bigint,
    sbt : SBT,
    proof : Proof
    //root : bigint
  ) : Promise<string> {
    // verify proof

    // hash(proof, publicAddress)
    const bytesData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[8]"],
      [proof]
    );
    return ethers.utils.keccak256(bytesData); 
  }
}
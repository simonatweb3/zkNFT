import {Contract, ethers, Signer} from "ethers"
import {Proof } from "@semaphore-protocol/proof"
import { FileType, SBT} from "./common";
import zksbtJson from "./ABI/Zksbt.json"

interface IBackend {
  checkEligible : (privateAddress : string, sbt : SBT) => boolean;
  certificate : (publicAddress: bigint, sbt : SBT, sig : string) => 
    Promise<{ eligible: boolean; signature: string; sbt_id: bigint; }>
  mint : (publicAddress: bigint, sbt : SBT, sig : string) => 
    Promise<{ eligible: boolean; sbt_id: bigint; }>
  generateProofKey : (publicAddress : bigint, sbt : SBT, salt : bigint, proof : Proof) => Promise<string>;
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

  public checkEligible(
    privateAddress : string,
    sbt : SBT
  ) : boolean {
    // TODO
    return true
  }

  public allocate_asset_id(sbt : SBT) : bigint {
    // TODO
    //return BigInt(5678);
    return BigInt(Math.floor(Math.random() * Math.pow(2, 32)))
  }

  public async mint(
    publicAddress : bigint,
    sbt : SBT,
    sig : string
  ) {
    const cert = await this.certificate(
      publicAddress,
      sbt,
      sig
    );

    console.log("cert ", cert)
    sbt.setId(cert.sbt_id)
    await (await this.pc.mint(
      [publicAddress],
      [sbt.normalize()],
      [cert.signature],
      {gasLimit : 2000000})
    ).wait()

    return {
      eligible : true,
      sbt_id : cert.sbt_id
    }
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

    if (!this.checkEligible(privateAddress, sbt)) {
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

  public async alloc_proof_key_salt(
    sbt : SBT
  ) {
    // TODO
    const pool = await this.pc.getSbtPool(sbt.category, sbt.attribute)
    return pool.salt.toBigInt()
  }

  public async generateProofKey(
    publicAddress : bigint,
    sbt : SBT,
    salt : bigint,
    proof : Proof
    //root : bigint
  ) : Promise<string> {
    // TODO : verify proof

    // hash(proof, publicAddress)
    const bytesData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[8]", "uint256", "uint256", "uint256"],
      [proof, publicAddress, sbt.normalize(), salt]
    );
    return ethers.utils.keccak256(bytesData); 
  }
}
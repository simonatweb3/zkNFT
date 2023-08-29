import {BigNumber, Contract, ethers, Signer} from "ethers"
import {Proof } from "@semaphore-protocol/proof"
import { certi_msg, claim_msg, FileType } from "./common";
import zksbtJson from "./ABI/Zksbt.json"

interface IBackend {
  checkEligible : (privateAddress : string, category : bigint, attribute : string) => boolean;
  certificate : (publicAddress: bigint, category : bigint, attribute : string, sig : string) => 
    Promise<{ eligible: boolean; signature: string; sbt_id: bigint; }>
  mint : (publicAddress: bigint, category : bigint, attribute : string, sig : string) => 
    Promise<{ eligible: boolean; sbt_id: bigint; }>
  generateProofKey : (publicAddress : bigint, category : bigint, attribute : string, sbtId : bigint, salt : bigint, proof : Proof) => Promise<string>;
  mintAndGetProofKey : (publicAddress: bigint, category : bigint, attribute : string, sig : string) =>
    Promise<{ eligible: boolean; sbt_id: bigint; proof_key : string }>
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
    category : bigint,
    attribute : string
  ) : boolean {
    // TODO
    return true
  }

  public allocate_asset_id(
    category : bigint,
    attribute : string
  ) : bigint {
    // TODO
    //return BigInt(5678);
    return BigInt(Math.floor(Math.random() * Math.pow(2, 32)))
  }

  public async mint(
    publicAddress : bigint,
    category : bigint,
    attribute : string,
    sig : string
  ) {
    const cert = await this.certificate(
      publicAddress,
      category,
      attribute,
      sig
    );

    //console.log("cert ", cert)

    await (await this.pc.mint(
      [
        {
          category: category,
          attribute: attribute,
          publicAddress: publicAddress,
          id: cert.sbt_id,
          verifyTimestamp: cert.verifyTimestamp
        }
      ]
      [cert.signature],
      {gasLimit : 3000000})
    ).wait()

    return {
      eligible : true,
      sbt_id : cert.sbt_id
    }
  }


  public async certificate(
    publicAddress : bigint,
    category : bigint,
    attribute : string,
    sig : string
  ) {
    const privateAddress = ethers.utils.verifyMessage(
      claim_msg(publicAddress.toString(), category, attribute),
      sig
    )

    if (!this.checkEligible(privateAddress, category, attribute)) {
      return {
        eligible : false,
        signature : "",
        sbt_id : BigInt(0),
        verifyTimestamp : BigInt(0)
      }
    }

    // allocate sbt_id
    const sbt_id = this.allocate_asset_id(category, attribute)

    const verifyTimestamp = BigInt(new Date().getTime());

    // server signature(publicAddress, sbt)
    const msg = certi_msg(publicAddress.toString(), category, attribute, sbt_id, verifyTimestamp)
    const certificate_signature = await this.signer.signMessage(msg);
    console.log("certificate_signature : ", certificate_signature)
    return {
      eligible : true,
      signature : certificate_signature,
      sbt_id : sbt_id,
      verifyTimestamp : verifyTimestamp
    }
  }

  public async alloc_proof_key_salt(
    category : bigint,
    attribute : string,
  ) {
    // TODO
    const pool = await this.pc.pools(category, attribute)
    return pool.salt.toBigInt()
  }

  public async generateProofKey(
    publicAddress : bigint,
    category : bigint,
    attribute : string,
    sbtId : bigint,
    salt : bigint,
    proof : Proof
    //root : bigint
  ) : Promise<string> {
    // TODO : verify proof


    const bytesData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[8]", "uint256", "uint64", "string", "uint128", "uint256"],
      [proof, publicAddress, category, attribute, sbtId, salt]
    );
    return ethers.utils.keccak256(bytesData); 
  }


  public init_salt() {
    return BigInt(1234)
  }

  public async mintAndGetProofKey(
    publicAddress: bigint,
    category : bigint,
    attribute : string,
    sig : string
  ) : Promise<{ eligible: boolean; sbt_id: bigint; proof_key : string }> {
    const mint_ret = await this.mint(
      publicAddress, category, attribute, sig
    )
    const proof : Proof = [
      BigInt(0), BigInt(0), BigInt(0), BigInt(0),
      BigInt(0), BigInt(0), BigInt(0), BigInt(0)
    ]
    const proof_key = await this.generateProofKey(publicAddress, category, attribute, mint_ret.sbt_id, this.init_salt(), proof)
    return {
      eligible : mint_ret.eligible,
      sbt_id : mint_ret.sbt_id,
      proof_key : proof_key
    }
  }

}
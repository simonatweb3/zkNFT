import {BigNumber, Contract, ethers, Signer} from "ethers"
import {Proof } from "@semaphore-protocol/proof"
import { certi_msg, claim_msg, FileType } from "./common";
import zksbtJson from "./ABI/Zksbt.json"

interface IBackend {
  checkEligible : (privateAddress : string, category : bigint, attribute : bigint) => boolean;
  certificate : (publicAddress: bigint, category : bigint, attribute : bigint, sig : string) => 
    Promise<{ eligible: boolean; signature: string; sbt_id: bigint; }>
  mint : (publicAddress: bigint, category : bigint, attribute : bigint, sig : string) => 
    Promise<{ eligible: boolean; sbt_id: bigint; }>
  generateProofKey : (publicAddress : bigint, category : bigint, attribute : bigint, salt : bigint, proof : Proof) => Promise<string>;
  mintAndGetProofKey : (publicAddress: bigint, category : bigint, attribute : bigint, sig : string) =>
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
    attribute : bigint
  ) : boolean {
    // TODO
    return true
  }

  public allocate_asset_id(
    category : bigint,
    attribute : bigint
  ) : bigint {
    // TODO
    //return BigInt(5678);
    return BigInt(Math.floor(Math.random() * Math.pow(2, 32)))
  }

  public async mint(
    publicAddress : bigint,
    category : bigint,
    attribute : bigint,
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
      [publicAddress],
      [category],
      [attribute],
      [cert.sbt_id],
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
    attribute : bigint,
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
        sbt_id : BigInt(0)
      }
    }

    // allocate sbt_id
    const sbt_id = this.allocate_asset_id(category, attribute)

    // server signature(publicAddress, sbt)
    const certificate_signature = await this.signer.signMessage(
      certi_msg(publicAddress.toString(), category, attribute, sbt_id)
    );
    return {
      eligible : true,
      signature : certificate_signature,
      sbt_id : sbt_id
    }
  }

  public async alloc_proof_key_salt(
    category : bigint,
    attribute : bigint,
  ) {
    // TODO
    const pool = await this.pc.getSbtPool(category, attribute)
    return pool.salt.toBigInt()
  }

  public async generateProofKey(
    publicAddress : bigint,
    category : bigint,
    attribute : bigint,
    salt : bigint,
    proof : Proof
    //root : bigint
  ) : Promise<string> {
    // TODO : verify proof


    const id = await this.pc.sbt_minted(category, attribute, publicAddress)
    const bytesData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[8]", "uint256", "uint64", "uint64", "uint128", "uint256"],
      [proof, publicAddress, category, attribute, id, salt]
    );
    return ethers.utils.keccak256(bytesData); 
  }


  public init_salt() {
    return BigInt(1234)
  }

  public async mintAndGetProofKey(
    publicAddress: bigint,
    category : bigint,
    attribute : bigint,
    sig : string
  ) : Promise<{ eligible: boolean; sbt_id: bigint; proof_key : string }> {
    const mint_ret = await this.mint(publicAddress, category, attribute, sig)
    const proof : Proof = [
      BigInt(0), BigInt(0), BigInt(0), BigInt(0),
      BigInt(0), BigInt(0), BigInt(0), BigInt(0)
    ]
    const proof_key = await this.generateProofKey(publicAddress, category, attribute, this.init_salt(), proof)
    return {
      eligible : mint_ret.eligible,
      sbt_id : mint_ret.sbt_id,
      proof_key : proof_key
    }
  }

}
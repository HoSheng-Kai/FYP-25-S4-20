import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import idl from "../idl/product_registry.json";

export const PROGRAM_ID = new PublicKey(idl.address);

const PRODUCT_SEED = Buffer.from("product");
const TRANSFER_SEED = Buffer.from("transfer");

export async function sha256To32Bytes(input: string): Promise<Uint8Array> {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return new Uint8Array(digest);
}

export async function deriveProductPda(
  manufacturer: PublicKey,
  serialNo: string
): Promise<[PublicKey, number, Uint8Array]> {
  const serialHash = await sha256To32Bytes(serialNo);
  const [pda, bump] = await PublicKey.findProgramAddress(
    [PRODUCT_SEED, manufacturer.toBuffer(), Buffer.from(serialHash)],
    PROGRAM_ID
  );
  return [pda, bump, serialHash];
}

export async function deriveTransferPda(
  productPda: PublicKey,
  fromOwner: PublicKey,
  toOwner: PublicKey
): Promise<[PublicKey, number]> {
  const [pda, bump] = await PublicKey.findProgramAddress(
    [TRANSFER_SEED, productPda.toBuffer(), fromOwner.toBuffer(), toOwner.toBuffer()],
    PROGRAM_ID
  );
  return [pda, bump];
}

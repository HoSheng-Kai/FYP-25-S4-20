import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import idlJson from "../idl/product_registry.json";

export const PROGRAM_ID = new PublicKey((idlJson as any).address);

const CLUSTER =
  import.meta.env.VITE_SOLANA_CLUSTER ?? "https://api.devnet.solana.com";

export const connection = new Connection(CLUSTER, "confirmed");

export function getProvider(wallet: WalletContextState) {
  if (!wallet || !wallet.publicKey) throw new Error("Wallet not connected");
  return new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
}

export function getProgram(provider: AnchorProvider) {
  const idlAny: any = idlJson;
  idlAny.metadata = idlAny.metadata ?? {};
  idlAny.metadata.address = PROGRAM_ID.toBase58(); // ✅ important

  return new Program(idlAny as Idl, provider);
}

import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import crypto from "crypto";
import pool from "../schema/database";
import idlJson from "../idl/product_registry.json";
import bs58 from "bs58";

console.log("IDL account names:", (idlJson as any).accounts?.map((a: any) => a.name));


// ----------------------------
// Config
// ----------------------------
const PROGRAM_ID = new PublicKey((idlJson as any).address);
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

const PRODUCT_V2_DATA_SIZE = 342;
const MAX_METADATA_URI_LEN = 200;

// Anchor needs a wallet; for read-only we can use a dummy wallet.
const dummyWallet = {
  publicKey: PublicKey.default,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any) => txs,
};

type OnChainProduct = {
  manufacturer: PublicKey;
  currentOwner: PublicKey;
  serialHash: number[] | Uint8Array;
  metadataHash: number[] | Uint8Array;
  metadataUri: string;
  active: boolean;
  bump: number;
};

function toHex32(bytes: number[] | Uint8Array): string {
  const b = Buffer.from(bytes as any);
  return b.toString("hex");
}

function sha256Hex(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function getLatestTxForAddress(addr: PublicKey): Promise<string | null> {
  const sigs = await connection.getSignaturesForAddress(addr, { limit: 1 });
  return sigs?.[0]?.signature ?? null;
}

type ProductMetadata = {
  serialNo: string;
  productName?: string | null;
  category?: string | null;
  batchNo?: string | null;
  manufactureDate?: string | null;
  description?: string | null;
};

async function fetchAndVerifyMetadata(uri: string, expectedHashHex: string) {
  console.log("Fetching metadata URI:", uri);

  // ✅ Fix Windows/Node fetch() issues with localhost
  if (uri.startsWith("http://localhost:")) {
    uri = uri.replace("http://localhost:", "http://127.0.0.1:");
  }

  let resp: Response;
  try {
    resp = await fetch(uri);
  } catch (e: any) {
    throw new Error(`fetch failed for uri=${uri} (${e?.message ?? e})`);
  }

  if (!resp.ok) throw new Error(`Metadata fetch failed (${resp.status}): ${uri}`);

  const text = await resp.text();
  const buf = Buffer.from(text, "utf8");

  const actualHashHex = sha256Hex(buf);
  if (actualHashHex !== expectedHashHex) {
    throw new Error(
      `Metadata hash mismatch.\nexpected=${expectedHashHex}\nactual=${actualHashHex}\nuri=${uri}`
    );
  }
  return JSON.parse(text) as ProductMetadata;
}

async function resolveUserIdByPubkey(pubkey: string): Promise<number | null> {
  const r = await pool.query(
    `SELECT user_id FROM fyp_25_s4_20.users WHERE public_key = $1 LIMIT 1`,
    [pubkey]
  );
  return r.rows.length ? r.rows[0].user_id : null;
}



async function upsertProductToDb(args: {
  productPda: string;
  registeredByUserId: number | null;
  txHash: string | null;
  meta: ProductMetadata;
}) {
  const q = `
    INSERT INTO fyp_25_s4_20.product (
      registered_by,
      serial_no,
      status,
      model,
      batch_no,
      category,
      manufacture_date,
      description,
      registered_on,
      product_pda,
      tx_hash
    )
    VALUES (
      $1,   -- registered_by
      $2,   -- serial_no
      'verified',
      $3,
      $4,
      $5,
      $6,
      $7,
      NOW(),
      $8,
      $9
    )
    ON CONFLICT (product_pda)
    DO UPDATE SET
      registered_by = COALESCE(fyp_25_s4_20.product.registered_by, EXCLUDED.registered_by),
      serial_no = EXCLUDED.serial_no,
      model = EXCLUDED.model,
      batch_no = EXCLUDED.batch_no,
      category = EXCLUDED.category,
      manufacture_date = EXCLUDED.manufacture_date,
      description = EXCLUDED.description,
      tx_hash = COALESCE(EXCLUDED.tx_hash, fyp_25_s4_20.product.tx_hash);
  `;

  await pool.query(q, [
    args.registeredByUserId,
    args.meta.serialNo,
    args.meta.productName ?? null,
    args.meta.batchNo ?? null,
    args.meta.category ?? null,
    args.meta.manufactureDate ?? null,
    args.meta.description ?? null,
    args.productPda,
    args.txHash,
  ]);
}


function decodeByIdlDiscriminator(program: Program, idl: any, data: Buffer) {
  const disc = data.subarray(0, 8);

  for (const acc of idl.accounts ?? []) {
    const d = Buffer.from(acc.discriminator);
    if (Buffer.from(d).equals(Buffer.from(disc))) {
      const account = program.coder.accounts.decode(acc.name, data);
      return { name: acc.name as string, account };
    }
  }

  return null;
}

function readPubkey(buf: Buffer, offset: number): PublicKey {
  return new PublicKey(buf.subarray(offset, offset + 32));
}

function readU8Array32(buf: Buffer, offset: number): Uint8Array {
  return Uint8Array.from(buf.subarray(offset, offset + 32));
}

// borsh string = u32 little-endian length + bytes
function readBorshString(buf: Buffer, offset: number) {
  const len = buf.readUInt32LE(offset);
  const start = offset + 4;
  const end = start + len;
  const str = buf.subarray(start, end).toString("utf8");
  return { value: str, nextOffset: end };
}

/**
 * Product v2 layout (total 342 bytes):
 * 0..7   discriminator (8)
 * 8..39  manufacturer (32)
 * 40..71 current_owner (32)
 * 72..103 serial_hash (32)
 * 104..135 metadata_hash (32)
 * 136..339 metadata_uri (4 + up to 200; BUT stored in fixed 200 in your size calc)
 * 340     active (1)
 * 341     bump (1)
 *
 * NOTE: Because you allocated fixed MAX_METADATA_URI_LEN=200,
 * the account is fixed 342 bytes (8 + 32+32+32+32 + 4+200 +1+1).
 */
function decodeProductV2(data: Buffer) {
  if (data.length !== PRODUCT_V2_DATA_SIZE) {
    throw new Error(`Unexpected size ${data.length}, expected ${PRODUCT_V2_DATA_SIZE}`);
  }

  // skip 8 discriminator
  let off = 8;

  const manufacturer = readPubkey(data, off); off += 32;
  const currentOwner = readPubkey(data, off); off += 32;

  const serialHash = readU8Array32(data, off); off += 32;
  const metadataHash = readU8Array32(data, off); off += 32;

  // metadata_uri is borsh string stored inside a fixed 4+200 region
  const uriRegionStart = off;
  const { value: metadataUri } = readBorshString(data, uriRegionStart);
  off = uriRegionStart + 4 + MAX_METADATA_URI_LEN; // jump entire fixed region

  const active = data.readUInt8(off) === 1; off += 1;
  const bump = data.readUInt8(off); off += 1;

  return { manufacturer, currentOwner, serialHash, metadataHash, metadataUri, active, bump };
}

async function getOrCreateProductIdByPda(productPda: string, serialNo: string): Promise<number> {
  // 1) Try by PDA
  const byPda = await pool.query(
    `SELECT product_id FROM fyp_25_s4_20.product WHERE product_pda = $1 LIMIT 1`,
    [productPda]
  );
  if (byPda.rows.length) return byPda.rows[0].product_id;

  // 2) Try by serial (unique)
  const bySerial = await pool.query(
    `SELECT product_id FROM fyp_25_s4_20.product WHERE serial_no = $1 LIMIT 1`,
    [serialNo]
  );
  if (bySerial.rows.length) {
    const pid = bySerial.rows[0].product_id;

    // attach PDA if missing
    await pool.query(
      `UPDATE fyp_25_s4_20.product SET product_pda = COALESCE(product_pda, $1) WHERE product_id = $2`,
      [productPda, pid]
    );

    return pid;
  }

  // 3) Create minimal product row if nothing exists
  const ins = await pool.query(
    `
    INSERT INTO fyp_25_s4_20.product
      (registered_by, serial_no, status, registered_on, product_pda)
    VALUES
      (NULL, $1, 'verified', NOW(), $2)
    RETURNING product_id
    `,
    [serialNo, productPda]
  );

  return ins.rows[0].product_id;
}

async function getUserIdByPubkey(pubkey: string): Promise<number | null> {
  const r = await pool.query(
    `SELECT user_id FROM fyp_25_s4_20.users WHERE public_key = $1 LIMIT 1`,
    [pubkey]
  );
  return r.rows.length ? r.rows[0].user_id : null;
}


async function upsertMetadataToDb(args: {
  productId: number;
  metadata: ProductMetadata;
  sha256Hex: string;
}) {
  // Store the same exact JSON you served (stable hash)
  const jsonText = JSON.stringify(args.metadata);

  await pool.query(
    `
    INSERT INTO fyp_25_s4_20.product_metadata
      (product_id, metadata_json, metadata_sha256_hex)
    VALUES ($1, $2::jsonb, $3)
    ON CONFLICT (product_id)
    DO UPDATE SET
      metadata_json = EXCLUDED.metadata_json,
      metadata_sha256_hex = EXCLUDED.metadata_sha256_hex
    `,
    [args.productId, jsonText, args.sha256Hex]
  );
}

async function main() {

  const who = await pool.query(`
    SELECT current_database() as db,
          current_schema() as schema,
          inet_server_addr() as server_ip,
          inet_server_port() as port,
          current_user as user
  `);
  console.log("DB CONNECTED:", who.rows[0]);

  const tables = await pool.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name IN ('product', 'product_metadata')
    ORDER BY table_schema, table_name;
  `);
  console.log("TABLES FOUND:", tables.rows);

  console.log("RPC:", RPC_URL);
  console.log("Program:", PROGRAM_ID.toBase58());

  const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: "confirmed" });
  const program = new Program(idlJson as unknown as Idl, provider as any);


  // Get discriminator from IDL
  const productAccDef = (idlJson as any).accounts?.find(
    (a: any) => a.name === "Product" || a.name === "product"
  );
  if (!productAccDef) throw new Error("IDL missing Product account definition");


  const PRODUCT_DISCRIMINATOR = Buffer.from(productAccDef.discriminator); // 8 bytes

  const rawAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { dataSize: PRODUCT_V2_DATA_SIZE },
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(PRODUCT_DISCRIMINATOR), // ✅ MUST be base58
        },
      },
    ],
  });

    console.log(`Found ${rawAccounts.length} Product v2 accounts (filtered).`);

  let ok = 0;
  let fail = 0;

  for (const a of rawAccounts) {
    const productPda = a.pubkey.toBase58();

    try {
      const decoded = decodeProductV2(Buffer.from(a.account.data));

      const metadataHashHex = Buffer.from(decoded.metadataHash).toString("hex");

      // verify JSON matches hash on-chain
      const meta = await fetchAndVerifyMetadata(decoded.metadataUri, metadataHashHex);

      // latest tx touching PDA
      const txHash = await getLatestTxForAddress(a.pubkey);

      const manufacturerPubkey = decoded.manufacturer.toBase58();
      const registeredByUserId = await resolveUserIdByPubkey(manufacturerPubkey);

      await upsertProductToDb({
        productPda,
        registeredByUserId,
        txHash,
        meta,
      });


      // ALSO save into product_metadata table
      const productId = await getOrCreateProductIdByPda(productPda, meta.serialNo);
      await upsertMetadataToDb({
        productId,
        metadata: meta,
        sha256Hex: metadataHashHex,
      });

      ok++;
      console.log(`✅ synced ${productPda} serial=${meta.serialNo} uri=${decoded.metadataUri}`);
    } catch (e: any) {
      fail++;
      console.warn(`❌ Failed ${productPda}: ${e?.message ?? String(e)}`);
    }
  }

  console.log(`Done. ok=${ok} fail=${fail}`);

  await pool.end();
  // process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import pool from "../schema/database";
import crypto from "crypto";
import { Connection, PublicKey } from "@solana/web3.js";

export type BlockchainStatus = "pending" | "on blockchain";
export type LifecycleStatus = "active" | "transferred";

export interface ProductScanResult {
  productId: number;
  productName: string | null;
  serialNumber: string;
  batchNumber: string | null;
  category: string | null;
  manufactureDate: Date | null;
  productDescription: string | null;
  registeredOn: Date;

  manufacturer: {
    userId: number | null;
    username: string | null;
    publicKey: string | null;
    verified: boolean | null;
  };

  currentOwner: {
    userId: number | null;
    username: string | null;
    publicKey: string | null;
  };

  lifecycleStatus: LifecycleStatus;
  blockchainStatus: BlockchainStatus;

  productPda: string | null;
  txHash: string | null;

  isAuthentic: boolean;
}

// ----------------------------
// Solana config (read-only)
// ----------------------------
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// ----------------------------
// Helpers
// ----------------------------
function sha256Hex(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function lookupUserByPubkey(pubkey: string) {
  const r = await pool.query(
    `SELECT user_id, username, public_key, verified
     FROM fyp_25_s4_20.users
     WHERE public_key = $1
     LIMIT 1`,
    [pubkey]
  );

  if (!r.rows.length) {
    return { userId: null, username: null, publicKey: pubkey, verified: null };
  }

  const u = r.rows[0];
  return {
    userId: u.user_id as number,
    username: u.username as string,
    publicKey: u.public_key as string,
    verified: u.verified as boolean | null,
  };
}

async function fetchMetadataAndVerify(uri: string, expectedHashHex: string) {
  // Node 18+ has global fetch; you are on Node 24 so OK.
  const resp = await fetch(uri);
  if (!resp.ok) return { ok: false as const, reason: `metadata fetch failed (${resp.status})` };

  const text = await resp.text(); // exact bytes
  const actual = sha256Hex(Buffer.from(text, "utf8"));
  if (actual !== expectedHashHex) {
    return { ok: false as const, reason: "metadata hash mismatch" };
  }

  return { ok: true as const, json: JSON.parse(text) };
}

/**
 * IMPORTANT:
 * Use the SAME decode layout you used in syncFromChain.ts (Product v2 fixed size).
 * This avoids IDL decode issues.
 */
const PRODUCT_V2_DATA_SIZE = 342;
const MAX_METADATA_URI_LEN = 200;

function readPubkey(buf: Buffer, offset: number): PublicKey {
  return new PublicKey(buf.subarray(offset, offset + 32));
}

function readU8Array32(buf: Buffer, offset: number): Uint8Array {
  return Uint8Array.from(buf.subarray(offset, offset + 32));
}

// borsh string = u32 LE length + bytes (stored in fixed 4+200 region)
function readBorshString(buf: Buffer, offset: number) {
  const len = buf.readUInt32LE(offset);
  const start = offset + 4;
  const end = start + len;
  const str = buf.subarray(start, end).toString("utf8");
  return { value: str };
}

function decodeProductV2(data: Buffer) {
  if (data.length !== PRODUCT_V2_DATA_SIZE) {
    throw new Error(`Unexpected size ${data.length}, expected ${PRODUCT_V2_DATA_SIZE}`);
  }

  let off = 8; // skip discriminator
  const manufacturer = readPubkey(data, off); off += 32;
  const currentOwner = readPubkey(data, off); off += 32;
  const serialHash = readU8Array32(data, off); off += 32;
  const metadataHash = readU8Array32(data, off); off += 32;

  const uriRegionStart = off;
  const { value: metadataUri } = readBorshString(data, uriRegionStart);
  off = uriRegionStart + 4 + MAX_METADATA_URI_LEN;

  const active = data.readUInt8(off) === 1; off += 1;
  const bump = data.readUInt8(off); off += 1;

  return { manufacturer, currentOwner, serialHash, metadataHash, metadataUri, active, bump };
}

async function markStopTracking(productId: number) {
  // If you didn't add track column yet, you can comment out track = false and keep status only.
  await pool.query(
    `UPDATE fyp_25_s4_20.product
     SET status = 'suspicious',
         track = FALSE
     WHERE product_id = $1`,
    [productId]
  );
}

// ----------------------------
// Main
// ----------------------------
export class ProductScan {
  static async findBySerial(serialNo: string): Promise<ProductScanResult | null> {
    const r = await pool.query(
      `
      SELECT *
      FROM fyp_25_s4_20.v_product_read
      WHERE serial_no = $1
      LIMIT 1;
      `,
      [serialNo]
    );

    if (r.rows.length === 0) return null;
    const row = r.rows[0];

    // Base objects (from DB view)
    let manufacturer = {
      userId: row.manufacturer_id ?? null,
      username: row.manufacturer_username ?? null,
      publicKey: row.manufacturer_public_key ?? null,
      verified: row.manufacturer_verified ?? null,
    };

    let currentOwner = {
      userId: row.current_owner_id ?? null,
      username: row.current_owner_username ?? null,
      publicKey: row.current_owner_public_key ?? null,
    };

    const lifecycleStatus = row.lifecycle_status as LifecycleStatus;
    const blockchainStatus = row.blockchain_status as BlockchainStatus;

    const productId = row.product_id as number;
    const productPda = row.product_pda ?? null;
    const txHash = row.tx_hash ?? null;

    // Start optimistic; we’ll downgrade if checks fail
    let isAuthentic = row.product_status !== "suspicious";

    // 1) Fill null manufacturer/currentOwner by pubkey->users (DB-known pk)
    if (!manufacturer.userId && manufacturer.publicKey) {
      manufacturer = await lookupUserByPubkey(manufacturer.publicKey);
    }
    if (!currentOwner.userId && currentOwner.publicKey) {
      const u = await lookupUserByPubkey(currentOwner.publicKey);
      currentOwner.userId = u.userId;
      currentOwner.username = u.username;
      // keep currentOwner.publicKey as-is
    }

    // 2) If “on blockchain”, verify metadata hash against on-chain
    if (blockchainStatus === "on blockchain" && productPda) {
      try {
        const pda = new PublicKey(productPda);
        const info = await connection.getAccountInfo(pda);

        if (!info?.data) {
          isAuthentic = false;
        } else {
          const decoded = decodeProductV2(Buffer.from(info.data));

          const onchainManufacturerPk = decoded.manufacturer.toBase58();
          const onchainOwnerPk = decoded.currentOwner.toBase58();
          const metadataUri = decoded.metadataUri;
          const metadataHashHex = Buffer.from(decoded.metadataHash).toString("hex");

          // If DB view had null pubkeys, fill them from chain
          if (!manufacturer.publicKey) manufacturer.publicKey = onchainManufacturerPk;
          if (!currentOwner.publicKey) currentOwner.publicKey = onchainOwnerPk;

          // If still missing userId, try lookup again using on-chain pubkeys
          if (!manufacturer.userId && manufacturer.publicKey) {
            manufacturer = await lookupUserByPubkey(manufacturer.publicKey);
          }
          if (!currentOwner.userId && currentOwner.publicKey) {
            const u = await lookupUserByPubkey(currentOwner.publicKey);
            currentOwner.userId = u.userId;
            currentOwner.username = u.username;
          }

          const check = await fetchMetadataAndVerify(metadataUri, metadataHashHex);
          if (!check.ok) {
            isAuthentic = false;

            // 3) If not authentic, stop tracking (your rule)
            await markStopTracking(productId);
          }
        }
      } catch {
        isAuthentic = false;
        await markStopTracking(productId);
      }
    }

    return {
      productId,
      productName: row.product_name ?? null,
      serialNumber: row.serial_no,
      batchNumber: row.batch_no ?? null,
      category: row.category ?? null,
      manufactureDate: row.manufacture_date ?? null,
      productDescription: row.description ?? null,
      registeredOn: row.registered_on,

      manufacturer,
      currentOwner,

      lifecycleStatus,
      blockchainStatus,

      productPda,
      txHash,

      isAuthentic,
    };
  }
  static async findByProductId(productId: number): Promise<ProductScanResult | null> {
    const r = await pool.query(
      `
      SELECT *
      FROM fyp_25_s4_20.v_product_read
      WHERE product_id = $1
      LIMIT 1;
      `,
      [productId]
    );

    if (r.rows.length === 0) return null;

    // Reuse your existing logic by calling findBySerial
    // This guarantees you keep the same blockchain/auth checks.
    const serial = r.rows[0].serial_no as string | null;
    if (!serial) return null;

    return await ProductScan.findBySerial(serial);
  }
}

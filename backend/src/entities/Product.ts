import pool from '../schema/database';

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
  status: string; // registered / verified / suspicious
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

  // optional: on-chain linkage
  productPda: string | null;
  txHash: string | null;

  // your API wants this
  isAuthentic: boolean;
}

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

    // simple authenticity rule (adjust if you want):
    // - must exist
    // - must not be suspicious
    // - AND must have on-chain tx (or you can allow pending as "not yet confirmed")
    const isAuthentic =
      row.product_status !== "suspicious" &&
      row.blockchain_status === "on blockchain";

    return {
      productId: row.product_id,
      productName: row.product_name ?? null,
      serialNumber: row.serial_no,
      batchNumber: row.batch_no ?? null,
      category: row.category ?? null,
      manufactureDate: row.manufacture_date ?? null,
      productDescription: row.description ?? null,
      status: row.product_status,
      registeredOn: row.registered_on,

      manufacturer: {
        userId: row.manufacturer_id ?? null,
        username: row.manufacturer_username ?? null,
        publicKey: row.manufacturer_public_key ?? null,
        verified: row.manufacturer_verified ?? null,
      },

      currentOwner: {
        userId: row.current_owner_id ?? null,
        username: row.current_owner_username ?? null,
        publicKey: row.current_owner_public_key ?? null,
      },

      lifecycleStatus: row.lifecycle_status as LifecycleStatus,
      blockchainStatus: row.blockchain_status as BlockchainStatus,

      productPda: row.product_pda ?? null,
      txHash: row.tx_hash ?? null,

      isAuthentic,
    };
  }
}
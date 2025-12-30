import pool from "../schema/database";

export type TxEvent = "REGISTER" | "TRANSFER" | "SELL";

export interface ProductHistoryRow {
  txHash: string;
  prevTxHash: string | null;

  event: TxEvent;
  blockSlot: number;
  createdOn: string;

  from: {
    userId: number | null;
    username: string | null;
    publicKey: string;
  };

  to: {
    userId: number | null;
    username: string | null;
    publicKey: string;
  };
}

export interface ProductHistoryResult {
  product: {
    productId: number;
    serialNo: string;
    productName: string | null;
    productPda: string | null;
    txHash: string | null; // product table tx_hash
  };
  history: ProductHistoryRow[];
}

export class ProductHistory {
  static async getBySerial(serialNo: string): Promise<ProductHistoryResult | null> {
    // 1) Find product by serial
    const p = await pool.query(
      `
      SELECT product_id, serial_no, model AS product_name, product_pda, tx_hash
      FROM fyp_25_s4_20.product
      WHERE serial_no = $1
      LIMIT 1;
      `,
      [serialNo]
    );

    if (p.rows.length === 0) return null;
    const product = p.rows[0];

    // 2) Fetch history from blockchain_node (DB event log)
    const h = await pool.query(
      `
      SELECT
        bn.tx_hash,
        bn.prev_tx_hash,
        bn.event,
        bn.block_slot,
        bn.created_on,

        bn.from_user_id,
        fu.username AS from_username,
        bn.from_public_key,

        bn.to_user_id,
        tu.username AS to_username,
        bn.to_public_key
      FROM fyp_25_s4_20.blockchain_node bn
      LEFT JOIN fyp_25_s4_20.users fu ON fu.user_id = bn.from_user_id
      LEFT JOIN fyp_25_s4_20.users tu ON tu.user_id = bn.to_user_id
      WHERE bn.product_id = $1
      ORDER BY bn.created_on ASC;
      `,
      [product.product_id]
    );

    const history: ProductHistoryRow[] = h.rows.map((r: any) => ({
      txHash: r.tx_hash,
      prevTxHash: r.prev_tx_hash ?? null,

      event: r.event,
      blockSlot: Number(r.block_slot),
      createdOn: new Date(r.created_on).toISOString(),

      from: {
        userId: r.from_user_id ?? null,
        username: r.from_username ?? null,
        publicKey: r.from_public_key,
      },

      to: {
        userId: r.to_user_id ?? null,
        username: r.to_username ?? null,
        publicKey: r.to_public_key,
      },
    }));

    return {
      product: {
        productId: product.product_id,
        serialNo: product.serial_no,
        productName: product.product_name ?? null,
        productPda: product.product_pda ?? null,
        txHash: product.tx_hash ?? null,
      },
      history,
    };
  }
}

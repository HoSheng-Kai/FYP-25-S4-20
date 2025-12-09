import pool from '../schema/database';

export type BlockchainStatus = 'on blockchain' | 'pending';

export interface ProductScanResult {
  productId: number;
  productName: string | null;
  serialNumber: string;
  batchNumber: string | null;
  category: string | null;
  manufactureDate: Date | null;
  productDescription: string | null;
  status: string;                 // registered / verified / suspicious
  registeredOn: Date;

  manufacturer: {
    userId: number;
    username: string;
    roleId: string;
  } | null;

  currentOwner: {
    userId: number;
    username: string;
    roleId: string;
    startOn: Date;
  } | null;

  blockchainStatus: BlockchainStatus;
  isAuthentic: boolean;
}

export class ProductScan {
  static async findBySerial(serial: string): Promise<ProductScanResult | null> {
    const client = await pool.connect();
    try {
      // 1) Get product + manufacturer
      const productRes = await client.query(
        `
        SELECT
          p.product_id,
          p.serial_no,
          p.model,
          p.batch_no,
          p.category,
          p.manufacture_date,
          p.description,
          p.status        AS product_status,
          p.registered_on,
          u.user_id       AS manufacturer_id,
          u.username      AS manufacturer_username,
          u.role_id       AS manufacturer_role
        FROM fyp_25_s4_20.product p
        LEFT JOIN fyp_25_s4_20.users u
          ON p.registered_by = u.user_id
        WHERE p.serial_no = $1;
        `,
        [serial]
      );

      if (productRes.rows.length === 0) {
        return null;
      }

      const p = productRes.rows[0];

      // 2) Check blockchain presence for this product
      const blockchainRes = await client.query(
        `
        SELECT 1
        FROM fyp_25_s4_20.blockchain_node bn
        WHERE bn.product_id = $1
        LIMIT 1;
        `,
        [p.product_id]
      );

      const blockchainStatus: BlockchainStatus =
        blockchainRes.rows.length > 0 ? 'on blockchain' : 'pending';

      // 3) Find current owner (if any)
      const ownerRes = await client.query(
        `
        SELECT
          o.owner_id,
          u.username AS owner_username,
          u.role_id  AS owner_role,
          o.start_on
        FROM fyp_25_s4_20.ownership o
        JOIN fyp_25_s4_20.users u
          ON o.owner_id = u.user_id
        WHERE o.product_id = $1
          AND o.end_on IS NULL
        ORDER BY o.start_on DESC
        LIMIT 1;
        `,
        [p.product_id]
      );

      let currentOwner: ProductScanResult['currentOwner'] = null;
      if (ownerRes.rows.length > 0) {
        const o = ownerRes.rows[0];
        currentOwner = {
          userId: o.owner_id,
          username: o.owner_username,
          roleId: o.owner_role,
          startOn: o.start_on,
        };
      }

      // 4) Manufacturer mapping
      const manufacturer = p.manufacturer_id
        ? {
            userId: p.manufacturer_id,
            username: p.manufacturer_username,
            roleId: p.manufacturer_role,
          }
        : null;

      // 5) Decide authenticity rule:
      //    - must be on blockchain
      //    - product status must be 'verified'
      //    - and not suspicious
      const isAuthentic =
        blockchainStatus === 'on blockchain' &&
        p.product_status === 'verified';

      return {
        productId: p.product_id,
        productName: p.model,
        serialNumber: p.serial_no,
        batchNumber: p.batch_no,
        category: p.category,
        manufactureDate: p.manufacture_date,
        productDescription: p.description,
        status: p.product_status,
        registeredOn: p.registered_on,
        manufacturer,
        currentOwner,
        blockchainStatus,
        isAuthentic,
      };
    } finally {
      client.release();
    }
  }
}

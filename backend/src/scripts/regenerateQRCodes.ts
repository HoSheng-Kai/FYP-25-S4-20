import pool from '../schema/database';
import { QrCodeService } from '../service/QrCodeService';

async function waitForDb(retries = 20, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      // lightweight ping
      await pool.query('SELECT 1');
      console.log('Database is ready');
      return;
    } catch (e) {
      console.log(`Waiting for DB... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('DB not ready after retries');
}

async function regenerateAllQRCodes() {
  console.log('Starting QR code regeneration...');

  // ✅ Wait BEFORE connecting / doing real work
  await waitForDb();

  const client = await pool.connect();

  try {
    // 1) set schema
    await client.query('SET search_path TO fyp_25_s4_20;');

    // 2) load all products
    const productsRes = await client.query(
      'SELECT product_id, serial_no, registered_by FROM product ORDER BY product_id;'
    );

    const rows = productsRes.rows;
    console.log(`Found ${rows.length} products.`);

    for (const row of rows) {
      const productId: number = row.product_id;
      const serialNo: string = row.serial_no;
      const registeredBy: number | null = row.registered_by;

      if (!registeredBy) {
        console.warn(
          `Skipping product ${productId} (${serialNo}) – no registered_by (manufacturerId)`
        );
        continue;
      }

      console.log(
        `Generating QR for product_id=${productId}, serial=${serialNo}, manufacturerId=${registeredBy}`
      );

      // 3) build payload (same as in ProductRegistration)
      const payload = QrCodeService.buildPayload(productId, serialNo, registeredBy);

      // 4) generate PNG buffer
      const qrBuffer = await QrCodeService.generatePngBuffer(payload);

      // 5) update DB
      await client.query(
        `
        UPDATE product
        SET qr_code = $1
        WHERE product_id = $2;
        `,
        [qrBuffer, productId]
      );
    }

    console.log('✅ QR code regeneration completed.');
  } catch (err) {
    console.error('❌ Error while regenerating QR codes:', err);
    process.exitCode = 1; // optional: mark failure for CI/scripts
  } finally {
    client.release();
    await pool.end();
  }
}

regenerateAllQRCodes();

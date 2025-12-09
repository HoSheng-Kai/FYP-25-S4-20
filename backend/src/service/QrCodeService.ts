// src/service/QrCodeService.ts
import QRCode from 'qrcode';
import crypto from 'crypto';

export class QrCodeService {
  /**
   * Build a unique, tamper-resistant payload for the QR code
   * based on product details.
   */
  static buildPayload(
    productId: number,
    serialNo: string,
    manufacturerId: number
  ): string {
    const base = `product:${productId}:${serialNo}:${manufacturerId}`;

    const secret = process.env.QR_SECRET || 'dev-qr-secret';

    const hash = crypto
      .createHmac('sha256', secret)
      .update(base)
      .digest('hex')
      .slice(0, 16); // short hash

    // Final payload encoded inside the QR
    return `FYP25|${productId}|${serialNo}|${manufacturerId}|${hash}`;
  }

  /**
   * Generate PNG buffer for a given payload.
   */
  static async generatePngBuffer(payload: string): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 5,
    });
  }
}

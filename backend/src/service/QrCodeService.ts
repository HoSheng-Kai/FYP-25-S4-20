// src/service/QrCodeService.ts
import crypto from "crypto";
import QRCode from "qrcode";

export class QrCodeService {
  // put this in .env (must be same across restarts)
  // QR_SECRET="some-long-random-secret"
  static secret(): string {
    return process.env.QR_SECRET || "DEV_ONLY_CHANGE_ME";
  }

  static buildPayload(productId: number, serialNo: string, manufacturerId: number) {
    const ts = Math.floor(Date.now() / 1000);

    const base = `http://localhost:5173/products/${productId}/details`;

    // const sig = crypto
    //   .createHmac("sha256", this.secret())
    //   .update(base, "utf8")
    //   .digest("hex");

    return `${base}`;
  }

  static verifyPayload(payload: string) {
    const url = new URL(`http://x/?${payload}`); // parse querystring
    const productId = url.searchParams.get("productId");
    const serial = url.searchParams.get("serial");
    const manufacturerId = url.searchParams.get("manufacturerId");
    const ts = url.searchParams.get("ts");
    const sig = url.searchParams.get("sig");

    if (!productId || !serial || !manufacturerId || !ts || !sig) {
      return { ok: false, reason: "Missing fields" as const };
    }

    const base = `http://localhost:5173/products/${productId}/details`;

    const expected = crypto
      .createHmac("sha256", this.secret())
      .update(base, "utf8")
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return { ok: false, reason: "Invalid signature" as const };
    }

    return {
      ok: true,
      productId: Number(productId),
      serial,
      manufacturerId: Number(manufacturerId),
      ts: Number(ts),
    };
  }

  static async generatePngBuffer(payload: string): Promise<Buffer> {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
    });

    // data:image/png;base64,...
    const base64 = dataUrl.split(",")[1];
    return Buffer.from(base64, "base64");
  }
}

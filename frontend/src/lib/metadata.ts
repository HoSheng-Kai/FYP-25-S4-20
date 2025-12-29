// frontend/src/lib/metadata.ts

export type ProductMetadata = {
  serialNo: string;
  productName?: string;
  batchNo?: string;
  category?: string;
  manufactureDate?: string;
  description?: string;
};


export function encodeJsonBytes(obj: unknown): Uint8Array {
  const text = JSON.stringify(obj); // MUST match backend
  return new TextEncoder().encode(text);
}

export async function sha256Bytes(input: Uint8Array): Promise<Uint8Array> {
  // Make a clean copy so TS treats it as a normal ArrayBuffer-backed view
  const data = new Uint8Array(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}


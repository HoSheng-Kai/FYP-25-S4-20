import type { Request, Response } from "express";
import crypto from "crypto";
import pool from "../schema/database";
import fs from "fs";
import path from "path";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export async function upsertProductMetadata(req: Request, res: Response) {
  try {
    const { productId, metadata } = (req.body || {}) as any;

    const pid = Number(productId);
    if (!pid || !metadata || typeof metadata !== "object") {
      return res.status(400).json({
        success: false,
        error: "Missing/invalid fields",
        details: ["productId (number)", "metadata (object)"],
      });
    }

    // Basic required key for your workflow
    if (!metadata.serialNo || typeof metadata.serialNo !== "string") {
      return res.status(400).json({
        success: false,
        error: "metadata.serialNo is required (string)",
      });
    }

    // Ensure product exists
    const p = await pool.query(
      `SELECT product_id FROM fyp_25_s4_20.product WHERE product_id = $1`,
      [pid]
    );
    if (p.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    // Store exact JSON string so hash is stable
    const jsonText = JSON.stringify(metadata);
    const hashHex = sha256Hex(jsonText);

    // Write EXACT bytes that we hashed so /metadata/:id.json matches on-chain hash
    const dir = path.join(process.cwd(), "metadata");
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${pid}.json`);
    fs.writeFileSync(filePath, jsonText, "utf8");

    await pool.query(
      `
      INSERT INTO fyp_25_s4_20.product_metadata (product_id, metadata_json, metadata_sha256_hex)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (product_id)
      DO UPDATE SET
        metadata_json = EXCLUDED.metadata_json,
        metadata_sha256_hex = EXCLUDED.metadata_sha256_hex
      `,
      [pid, jsonText, hashHex]
    );

    // Base URL (lets you change later when hosting)
    const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    const metadataUri = `${baseUrl}/metadata/${pid}.json`;

    return res.status(200).json({
      success: true,
      metadataUri,
      metadataSha256Hex: hashHex,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Failed to store metadata",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

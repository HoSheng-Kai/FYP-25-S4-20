import type { Request, Response } from "express";
import crypto from "crypto";
import pool from "../schema/database";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

// POST /api/products/metadata
// Stores draft metadata in DB only (no file), allowed ONLY before confirm
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

    if (!metadata.serialNo || typeof metadata.serialNo !== "string") {
      return res.status(400).json({
        success: false,
        error: "metadata.serialNo is required (string)",
      });
    }

    // block draft edits AFTER confirm
    const lock = await pool.query(
      `SELECT product_id, tx_hash FROM fyp_25_s4_20.product WHERE product_id = $1`,
      [pid]
    );

    if (lock.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const tx = lock.rows[0]?.tx_hash;
    if (tx && String(tx).trim() !== "") {
      return res.status(409).json({
        success: false,
        error: "Metadata is locked after blockchain confirmation",
        details: "Use metadata-final only once after confirm; draft cannot change.",
      });
    }

    // hash stable bytes
    const jsonText = JSON.stringify(metadata);
    const hashHex = sha256Hex(jsonText);

    // upsert draft record
    await pool.query(
      `
      INSERT INTO fyp_25_s4_20.product_metadata
        (product_id, metadata_json, metadata_sha256_hex, is_final, metadata_uri)
      VALUES
        ($1, $2::jsonb, $3, FALSE, NULL)
      ON CONFLICT (product_id)
      DO UPDATE SET
        metadata_json = EXCLUDED.metadata_json,
        metadata_sha256_hex = EXCLUDED.metadata_sha256_hex,
        is_final = FALSE,
        metadata_uri = NULL
      `,
      [pid, jsonText, hashHex]
    );

    // This is the *future* URI after finalize (hash-based)
    const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    const metadataUri = `${baseUrl}/metadata/${hashHex}.json`;

    return res.status(200).json({
      success: true,
      metadataUri,
      metadataSha256Hex: hashHex,
      isFinal: false,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Failed to store metadata",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

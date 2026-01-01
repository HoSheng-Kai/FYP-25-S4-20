import type { Request, Response } from "express";
import pool from "../schema/database";

export async function getMetadataJson(req: Request, res: Response) {
  try {
    const raw = req.params.id; // e.g. "abcd1234...json" OR "37.json"
    const idStr = raw.endsWith(".json") ? raw.slice(0, -5) : raw;

    // If it's a number, treat as productId. Otherwise treat as hash.
    const asNumber = Number(idStr);
    const isProductId = Number.isFinite(asNumber) && asNumber > 0 && String(asNumber) === idStr;

    const r = isProductId
      ? await pool.query(
          `
          SELECT metadata_json
          FROM fyp_25_s4_20.product_metadata
          WHERE product_id = $1
          `,
          [asNumber]
        )
      : await pool.query(
          `
          SELECT metadata_json
          FROM fyp_25_s4_20.product_metadata
          WHERE metadata_sha256_hex = $1
          ORDER BY created_on DESC
          LIMIT 1
          `,
          [idStr]
        );

    if (r.rows.length === 0) {
      return res.status(404).send("metadata not found");
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(JSON.stringify(r.rows[0].metadata_json));
  } catch (err) {
    return res.status(500).send(err instanceof Error ? err.message : String(err));
  }
}

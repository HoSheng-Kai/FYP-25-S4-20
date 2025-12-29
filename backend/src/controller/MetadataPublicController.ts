import type { Request, Response } from "express";
import pool from "../schema/database";

export async function getMetadataJson(req: Request, res: Response) {
  try {
    const raw = req.params.productId; // "123.json" or "123"
    const idStr = raw.endsWith(".json") ? raw.slice(0, -5) : raw;
    const productId = Number(idStr);

    if (!productId) {
      return res.status(400).send("Invalid productId");
    }

    const r = await pool.query(
      `
      SELECT metadata_json
      FROM fyp_25_s4_20.product_metadata
      WHERE product_id = $1
      `,
      [productId]
    );

    if (r.rows.length === 0) {
      return res.status(404).send("metadata not found");
    }

    // Respond as JSON (exact content)
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(JSON.stringify(r.rows[0].metadata_json));
  } catch (err) {
    return res.status(500).send(err instanceof Error ? err.message : String(err));
  }
}

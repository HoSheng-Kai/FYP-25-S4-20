import { Router } from "express";
import { getMetadataJson } from "../controller/MetadataPublicController";

const router = Router();

// Public URL that your on-chain metadataUri points to:
router.get("/:productId", getMetadataJson);

export default router;

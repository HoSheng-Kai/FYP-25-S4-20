import path from "path";
import express from "express";
import cors from "cors";

import userRouter from "./router/userRouter";
import distributorRouter from "./router/distributorRouter";
import adminRouter from "./router/adminRouter";
import validationRouter from "./router/validationRouter";
import productRouter from "./router/productRouter";
import notificationRouter from "./router/notificationRouter";
import reviewRouter from "./router/reviewRouter";
import metadataRouter from "./router/metadataRouter";
import chatRouter from "./router/chatRouter";
import ChatEntity from "./entities/Chat";
import { upsertProductMetadata } from "./controller/ProductMetadata";
import { sanitize } from "./utils/sanitise";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
]);

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    // allow Postman/curl (no origin)
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(null, false); // IMPORTANT: don't throw Error (can look like network failure)
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// preflight for all routes
app.options(/.*/, cors(corsOptions));

// sanitize incoming data
app.use((req, _res, next) => {
  if (req.body) req.body = sanitize(req.body);

  if (req.query) {
    for (const key of Object.keys(req.query)) {
      (req.query as Record<string, unknown>)[key] = sanitize(req.query[key]);
    }
  }

  if (req.params) {
    for (const key of Object.keys(req.params)) {
      req.params[key] = sanitize(req.params[key]) as string;
    }
  }
  next();
});

// routes
app.use("/api/users", userRouter);
app.use("/api/admins", adminRouter);
app.use("/api/products", productRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/chats", chatRouter);

app.use("/api/distributors", distributorRouter);
app.use("/api/validate", validationRouter);

app.post("/api/products/metadata", upsertProductMetadata);

// serve backend/metadata as /metadata
app.use("/metadata", express.static(path.join(process.cwd(), "metadata")));

// for debugging
app.get("/api/ping", (_req, res) => res.json({ ok: true }));

// Initialize chat tables on boot
(async () => {
  try {
    await ChatEntity.init();
    console.log("✓ Chat schema initialized");
  } catch (e) {
    console.error("⚠ Chat schema init failed:", e instanceof Error ? e.message : e);
  }

  app.listen(3000, () => console.log("✓ Server running on port 3000"));
})();

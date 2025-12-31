import path from "path";
import express from 'express';
import cors from 'cors';

import userRouter from './router/userRouter';
import distributorRouter from './router/distributorRouter';
import adminRouter from './router/adminRouter';
import validationRouter from './router/validationRouter';
import productRouter from './router/productRouter';
import notificationRouter from './router/notificationRouter';
import reviewRouter from './router/reviewRouter';
// import { syncFromChain } from "../scripts/syncFromChain";
import metadataRouter from "./router/metadataRouter";
import { upsertProductMetadata } from "./controller/ProductMetadata";

import { sanitize } from "./utils/sanitise";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // optional but useful

// app.use(
//   cors({
//     origin: "http://localhost:5173", // change if your frontend runs elsewhere
//     credentials: true,
//   })
// );

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow Postman/curl (no origin)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ FIX: RegExp, avoids path-to-regexp crash
app.options(/.*/, cors());

// sanitize incoming data
// TODO: Need test case for this
app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body);
  // req.query and req.params are read-only, sanitize in place
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

app.use('/api/users', userRouter);
app.use('/api/admins', adminRouter);
app.use('/api/products', productRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/reviews', reviewRouter);

// Testing blockchain here
app.use('/api/distributors', distributorRouter);
app.use('/api/validate', validationRouter);

app.post("/api/products/metadata", upsertProductMetadata);

// serve backend/metadata as /metadata
app.use("/metadata", express.static(path.join(process.cwd(), "metadata")));

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
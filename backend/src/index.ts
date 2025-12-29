import path from "path";
import express from 'express';
import cors from 'cors';

import userRouter from './router/userRouter';
import distributorRouter from './router/distributorRouter';
import adminRouter from './router/adminRouter';
import validationRouter from './router/validationRouter';
import productRouter from './router/productRouter';
import notificationRouter from './router/notificationRouter';
// import { syncFromChain } from "../scripts/syncFromChain";
import metadataRouter from "./router/metadataRouter";
import { upsertProductMetadata } from "./controller/ProductMetadata";

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


app.use('/api/users', userRouter);
app.use('/api/admins', adminRouter);
app.use('/api/products', productRouter);
app.use('/api/notifications', notificationRouter);

// Testing blockchain here
app.use('/api/distributor', distributorRouter);
// app.use('/api/validate', validationRouter)

app.post("/api/products/metadata", upsertProductMetadata);

// serve backend/metadata as /metadata
app.use("/metadata", express.static(path.join(process.cwd(), "metadata")));

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
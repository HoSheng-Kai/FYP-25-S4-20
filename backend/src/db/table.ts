import * as Enums from "./enum";

/* ===========================
   users TABLE
   =========================== */

export interface users {
  user_id?: number;
  username: string;
  password_hash: string;
  email: string;
  role_id: Enums.user_role;

  private_key: string | null;
  public_key: string | null;

  created_on: Date;
}

/* ===========================
   product TABLE
   =========================== */

export interface product {
  product_id?: number;

  registered_by: number | null;

  serial_no: string;
  qr_code: Buffer | null;

  status: Enums.product_status;

  model: string | null;
  batch_no: string | null;
  category: string | null;

  manufacture_date: Date | null;
  description: string | null;

  registered_on: Date;
}

/* ===========================
   product_listing TABLE
   =========================== */

export interface product_listing {
  listing_id?: number;

  product_id: number;
  seller_id: number;

  price: string | null;     // NUMERIC(10,2)
  currency: Enums.currency;

  status: Enums.availability;

  created_on?: Date;
}

/* ===========================
   blockchain_node TABLE
   =========================== */

export interface blockchain_node {
  tx_hash: string;
  prev_tx_hash: string;
  from_user_id: number;
  from_public_key: string;
  to_user_id: number;
  to_public_key: string;
  product_id: number;
  block_slot: number;
  created_on: Date;
}

/* ===========================
   ownership TABLE
   =========================== */

export interface ownership {
  ownership_id?: number;
  owner_id: number;
  owner_public_key: string;
  product_id: number;
  start_on: Date;
  end_on: Date | null;
  tx_hash: string;
}

/* ===========================
   review TABLE
   =========================== */

export interface review {
  review_id?: number;

  owner_id: number;
  author_id: number | null;

  rating: number;

  comment: string | null;

  created_on?: Date;
}

/* ===========================
   notification TABLE
   =========================== */

export interface notification {
  notification_id?: number;
  user_id: number;

  title: string;
  message: string;

  is_read: boolean;

  created_on?: Date;
}
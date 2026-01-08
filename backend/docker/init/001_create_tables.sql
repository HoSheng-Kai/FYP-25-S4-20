CREATE SCHEMA IF NOT EXISTS fyp_25_s4_20;
SET search_path TO fyp_25_s4_20;

-- ===========================
-- ENUM TYPES
-- ===========================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','manufacturer','distributor','retailer','consumer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE availability AS ENUM ('available','reserved','sold');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE currency AS ENUM ('SGD','USD','EUR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('registered','verified','suspicious');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tx_event AS ENUM ('REGISTER','TRANSFER','SELL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================
-- USERS
-- ===========================

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role_id user_role NOT NULL,
    private_key TEXT,
    public_key TEXT,
    verified BOOLEAN,
    banned BOOLEAN DEFAULT FALSE,
    created_on TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- PRODUCT
-- ===========================

CREATE TABLE IF NOT EXISTS product (
  product_id SERIAL PRIMARY KEY,
  registered_by INT REFERENCES users(user_id) ON DELETE SET NULL,
  serial_no TEXT NOT NULL UNIQUE,
  qr_code BYTEA UNIQUE,
  status product_status NOT NULL,
  model TEXT,
  batch_no TEXT,
  category TEXT,
  manufacture_date TIMESTAMPTZ,
  description TEXT,
  registered_on TIMESTAMP DEFAULT NOW(),

  product_pda TEXT,
  tx_hash TEXT,
  blockchain_tx TEXT,
  track BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_product_tx_hash
ON product (tx_hash);

-- ONE AND ONLY ONE uniqueness rule for product_pda
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_product_pda
ON product (product_pda)
WHERE product_pda IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_tx_hash
ON product (tx_hash)
WHERE tx_hash IS NOT NULL AND tx_hash <> '';

-- ===========================
-- PRODUCT LISTING
-- ===========================

CREATE TABLE IF NOT EXISTS product_listing (
  listing_id SERIAL PRIMARY KEY,
  product_id INT REFERENCES product(product_id) ON DELETE CASCADE,
  seller_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  price NUMERIC(10,2),
  currency currency NOT NULL,
  status availability NOT NULL,
  created_on TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- Notification Table
-- ===========================
-- Create notification table if missing
CREATE TABLE IF NOT EXISTS fyp_25_s4_20.notification (
  notification_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES fyp_25_s4_20.users(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_on TIMESTAMP DEFAULT NOW(),

  -- optional linkage (can be null for generic notifications)
  product_id INT REFERENCES fyp_25_s4_20.product(product_id) ON DELETE CASCADE,
  tx_hash TEXT
);

-- Helpful index for reads
CREATE INDEX IF NOT EXISTS idx_notification_user_created
ON fyp_25_s4_20.notification (user_id, created_on DESC);

-- Add UNIQUE CONSTRAINT for idempotency (this is what ON CONFLICT ON CONSTRAINT needs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_user_product_tx_uniq'
      AND conrelid = 'fyp_25_s4_20.notification'::regclass
  ) THEN
    ALTER TABLE fyp_25_s4_20.notification
      ADD CONSTRAINT notification_user_product_tx_uniq
      UNIQUE (user_id, product_id, tx_hash);
  END IF;
END $$;

-- ===========================
-- BLOCKCHAIN NODE
-- ===========================

CREATE TABLE IF NOT EXISTS blockchain_node (
  tx_hash TEXT PRIMARY KEY,
  prev_tx_hash TEXT,

  from_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
  from_public_key TEXT NOT NULL,

  to_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
  to_public_key TEXT NOT NULL,

  product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
  block_slot BIGINT NOT NULL,
  created_on TIMESTAMP DEFAULT NOW(),

  event tx_event NOT NULL DEFAULT 'TRANSFER'
);

-- Only ONE REGISTER per product
CREATE UNIQUE INDEX IF NOT EXISTS ux_blockchain_node_register_once
ON blockchain_node (product_id)
WHERE event = 'REGISTER';

-- ===========================
-- OWNERSHIP
-- ===========================

CREATE TABLE IF NOT EXISTS ownership (
  ownership_id SERIAL PRIMARY KEY,
  owner_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  owner_public_key TEXT NOT NULL,
  product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
  start_on TIMESTAMP NOT NULL,
  end_on TIMESTAMP NULL,
  tx_hash TEXT NULL REFERENCES blockchain_node(tx_hash) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_ownership
ON ownership (product_id)
WHERE end_on IS NULL;

-- ===========================
-- PRODUCT METADATA
-- ===========================

CREATE TABLE IF NOT EXISTS product_metadata (
  product_id INT PRIMARY KEY
    REFERENCES product(product_id)
    ON DELETE CASCADE,

  metadata_json JSONB NOT NULL,
  metadata_sha256_hex TEXT NOT NULL,
  created_on TIMESTAMP DEFAULT NOW(),
  updated_on TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_metadata_sha
ON product_metadata (metadata_sha256_hex);

CREATE OR REPLACE FUNCTION set_updated_on()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_on = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_metadata_updated ON product_metadata;

CREATE TRIGGER trg_product_metadata_updated
BEFORE UPDATE ON product_metadata
FOR EACH ROW
EXECUTE FUNCTION set_updated_on();

-- drop the partial unique index
DROP INDEX IF EXISTS fyp_25_s4_20.ux_product_product_pda;

-- ===========================
-- READ MODEL VIEW
-- ===========================

CREATE OR REPLACE VIEW v_product_read AS
SELECT
  p.product_id,
  p.serial_no,
  p.model AS product_name,
  p.category,
  p.batch_no,
  p.manufacture_date,
  p.description,
  p.status AS product_status,
  p.registered_on,
  p.track,

  p.registered_by AS manufacturer_id,
  m.username AS manufacturer_username,
  m.public_key AS manufacturer_public_key,
  m.verified AS manufacturer_verified,

  p.product_pda,
  p.tx_hash,

  CASE
    WHEN p.tx_hash IS NULL THEN 'pending'
    ELSE 'on blockchain'
  END AS blockchain_status,

  CASE
    WHEN EXISTS (
      SELECT 1 FROM ownership o
      WHERE o.product_id = p.product_id
        AND o.end_on IS NOT NULL
    )
    THEN 'transferred'
    ELSE 'active'
  END AS lifecycle_status,

  COALESCE(o_active.owner_id, p.registered_by) AS current_owner_id,
  COALESCE(u_owner.username, m.username) AS current_owner_username,
  COALESCE(o_active.owner_public_key, m.public_key) AS current_owner_public_key

FROM product p
LEFT JOIN users m ON m.user_id = p.registered_by
LEFT JOIN LATERAL (
  SELECT * FROM ownership o
  WHERE o.product_id = p.product_id AND o.end_on IS NULL
  LIMIT 1
) o_active ON TRUE
LEFT JOIN users u_owner ON u_owner.user_id = o_active.owner_id;

-- ===========================
-- product_pda should be unique when present
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_product_pda
ON fyp_25_s4_20.product (product_pda)
WHERE product_pda IS NOT NULL;

-- optional: also enforce as constraint (either index OR constraint is enough)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_product_pda_unique'
      AND conrelid = 'fyp_25_s4_20.product'::regclass
  ) THEN
    ALTER TABLE fyp_25_s4_20.product
    ADD CONSTRAINT product_product_pda_unique UNIQUE (product_pda);
  END IF;
END $$;

-- ===========================
ALTER TABLE fyp_25_s4_20.product_metadata
ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE fyp_25_s4_20.product_metadata
ADD COLUMN IF NOT EXISTS metadata_uri TEXT;

-- optional but useful
CREATE INDEX IF NOT EXISTS idx_product_metadata_final
ON fyp_25_s4_20.product_metadata (is_final);

-- Ensure schema
CREATE SCHEMA IF NOT EXISTS fyp_25_s4_20;

-- Product metadata table (1 row per product, immutable after insert)
CREATE TABLE IF NOT EXISTS fyp_25_s4_20.product_metadata (
  product_id INT PRIMARY KEY
    REFERENCES fyp_25_s4_20.product(product_id)
    ON DELETE CASCADE,
  metadata_json JSONB NOT NULL,
  metadata_sha256_hex TEXT NOT NULL,
  created_on TIMESTAMP DEFAULT NOW()
);

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_product_metadata_sha
ON fyp_25_s4_20.product_metadata (metadata_sha256_hex);


DROP VIEW IF EXISTS fyp_25_s4_20.v_product_read CASCADE;

-- Read model view with latest listing info
CREATE VIEW fyp_25_s4_20.v_product_read AS
SELECT
  p.product_id,
  p.serial_no,
  p.model                 AS product_name,
  p.category,
  p.batch_no,
  p.manufacture_date,
  p.description,
  p.status                AS product_status,
  p.registered_on,
  p.track,

  -- Manufacturer info
  p.registered_by         AS manufacturer_id,
  m.username              AS manufacturer_username,
  m.public_key            AS manufacturer_public_key,
  m.verified              AS manufacturer_verified,

  -- On-chain linkage
  p.product_pda,
  p.tx_hash,

  -- Latest listing (THIS WAS MISSING)
  pl_latest.listing_id,
  pl_latest.price,
  pl_latest.currency,
  pl_latest.status        AS listing_status,
  pl_latest.created_on    AS listing_created_on,

  -- Blockchain status
  CASE
    WHEN p.tx_hash IS NULL OR p.tx_hash = '' THEN 'pending'
    ELSE 'on blockchain'
  END AS blockchain_status,

  -- Lifecycle status
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM fyp_25_s4_20.ownership o
      WHERE o.product_id = p.product_id
        AND o.end_on IS NOT NULL
    )
    THEN 'transferred'
    ELSE 'active'
  END AS lifecycle_status,

  -- Current owner
  COALESCE(o_active.owner_id, p.registered_by) AS current_owner_id,
  COALESCE(u_owner.username, m.username)       AS current_owner_username,
  COALESCE(o_active.owner_public_key, m.public_key) AS current_owner_public_key

FROM fyp_25_s4_20.product p
LEFT JOIN fyp_25_s4_20.users m
  ON m.user_id = p.registered_by

-- Latest listing per product
LEFT JOIN LATERAL (
  SELECT *
  FROM fyp_25_s4_20.product_listing pl
  WHERE pl.product_id = p.product_id
  ORDER BY pl.created_on DESC
  LIMIT 1
) pl_latest ON TRUE

-- Active ownership
LEFT JOIN LATERAL (
  SELECT *
  FROM fyp_25_s4_20.ownership o
  WHERE o.product_id = p.product_id
    AND o.end_on IS NULL
  LIMIT 1
) o_active ON TRUE

LEFT JOIN fyp_25_s4_20.users u_owner
  ON u_owner.user_id = o_active.owner_id;

-- ===========================
-- REVIEW
-- ===========================
CREATE TABLE IF NOT EXISTS review (
    review_id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    author_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    COMMENT TEXT,
    created_on TIMESTAMP DEFAULT NOW()
);

ALTER TABLE fyp_25_s4_20.product
ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'draft';

-- Optional: restrict allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_stage_check'
      AND conrelid = 'fyp_25_s4_20.product'::regclass
  ) THEN
    ALTER TABLE fyp_25_s4_20.product
    ADD CONSTRAINT product_stage_check
    CHECK (stage IN ('draft','confirmed','onchain'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_stage
ON fyp_25_s4_20.product(stage);





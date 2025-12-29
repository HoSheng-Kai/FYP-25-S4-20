CREATE SCHEMA IF NOT EXISTS fyp_25_s4_20;

SET search_path TO fyp_25_s4_20;

CREATE TYPE user_role AS ENUM (
    'admin',
    'manufacturer',
    'distributor',
    'retailer',
    'consumer'
);

CREATE TYPE availability AS ENUM ('available', 'reserved', 'sold');

CREATE TYPE currency AS ENUM ('SGD', 'USD', 'EUR');

CREATE TYPE product_status AS ENUM ('registered', 'verified', 'suspicious');

CREATE TYPE tx_event AS ENUM ('REGISTER', 'TRANSFER', 'SELL');

-- ===========================
-- Users Table
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
-- Product Table
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
    manufacture_date DATE,
    description TEXT,
    registered_on TIMESTAMP DEFAULT NOW(),

    -- on-chain references
    product_pda TEXT,
    tx_hash TEXT,
    blockchain_tx TEXT
);

CREATE INDEX IF NOT EXISTS idx_product_tx_hash
ON product (tx_hash);


-- ===========================
-- Product Listing Table
-- ===========================
CREATE TABLE IF NOT EXISTS product_listing (
    listing_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(product_id) ON DELETE CASCADE,
    seller_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    price NUMERIC(10, 2),
    currency currency NOT NULL,
    STATUS availability NOT NULL,
    created_on TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- Blockchain Node Table
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

-- ===========================
-- Ownership Table
-- ===========================
CREATE TABLE IF NOT EXISTS ownership (
    ownership_id SERIAL PRIMARY KEY,

    -- Owner details
    owner_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    owner_public_key TEXT NOT NULL,
    product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,

    -- Timestamps
    start_on TIMESTAMP NOT NULL,
    end_on TIMESTAMP NULL,

    -- Link to blockchain
    tx_hash TEXT NOT NULL REFERENCES blockchain_node(tx_hash) ON DELETE CASCADE
);

-- Create partial unique index for active ownership
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_ownership 
ON ownership (product_id) 
WHERE end_on IS NULL;

-- ===========================
-- Review Table
-- ===========================
CREATE TABLE IF NOT EXISTS review (
    review_id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    author_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    COMMENT TEXT,
    created_on TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- Notification Table
-- ===========================
CREATE TABLE IF NOT EXISTS notification (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_on TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- Add validation functions and triggers
-- ===========================

-- Function to validate blockchain_node keys match users
CREATE OR REPLACE FUNCTION validate_blockchain_keys()
RETURNS TRIGGER AS $$
BEGIN
    -- Check from_user_id matches from_public_key
    IF NEW.from_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = NEW.from_user_id 
            AND public_key = NEW.from_public_key
        ) THEN
            RAISE EXCEPTION 'from_public_key does not match user public key';
        END IF;
    END IF;
    
    -- Check to_user_id matches to_public_key
    IF NEW.to_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE user_id = NEW.to_user_id 
            AND public_key = NEW.to_public_key
        ) THEN
            RAISE EXCEPTION 'to_public_key does not match user public key';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for blockchain_node validation
CREATE TRIGGER validate_blockchain_keys_trigger
BEFORE INSERT OR UPDATE ON blockchain_node
FOR EACH ROW
EXECUTE FUNCTION validate_blockchain_keys();

-- Function to validate ownership keys match users
CREATE OR REPLACE FUNCTION validate_ownership_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE user_id = NEW.owner_id 
        AND public_key = NEW.owner_public_key
    ) THEN
        RAISE EXCEPTION 'owner_public_key does not match user public key';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ownership validation
CREATE TRIGGER validate_ownership_key_trigger
BEFORE INSERT OR UPDATE ON ownership
FOR EACH ROW
EXECUTE FUNCTION validate_ownership_key();

-- ============================================================
-- VIEW: Centralized "read model" for product cards / verify page
-- ============================================================
CREATE OR REPLACE VIEW fyp_25_s4_20.v_product_read AS
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

  -- Manufacturer info
  p.registered_by         AS manufacturer_id,
  m.username              AS manufacturer_username,
  m.public_key            AS manufacturer_public_key,
  m.verified              AS manufacturer_verified,

  -- On-chain linkage (from your product table)
  p.product_pda,
  p.tx_hash,

  -- Latest listing (if any)
  pl_latest.listing_id,
  pl_latest.price,
  pl_latest.currency,
  pl_latest.status        AS listing_status,
  pl_latest.created_on    AS listing_created_on,

  -- Blockchain status:
  CASE
    WHEN p.tx_hash IS NULL OR p.tx_hash = '' THEN 'pending'
    ELSE 'on blockchain'
  END AS blockchain_status,

  -- Lifecycle status:
  -- Default should be ACTIVE unless we can prove it was transferred.
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

  -- Current owner (falls back to manufacturer if no ownership rows yet)
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

-- Active ownership (end_on IS NULL)
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
-- Product Metadata (for on-chain metadataUri)
-- ===========================
CREATE TABLE IF NOT EXISTS product_metadata (
  product_id INT PRIMARY KEY
    REFERENCES fyp_25_s4_20.product(product_id)
    ON DELETE CASCADE,

  metadata_json JSONB NOT NULL,
  metadata_sha256_hex TEXT NOT NULL,

  created_on TIMESTAMP DEFAULT NOW(),
  updated_on TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_metadata_sha
ON product_metadata (metadata_sha256_hex);

CREATE OR REPLACE FUNCTION fyp_25_s4_20.set_updated_on()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_on = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_metadata_updated ON fyp_25_s4_20.product_metadata;

CREATE TRIGGER trg_product_metadata_updated
BEFORE UPDATE ON fyp_25_s4_20.product_metadata
FOR EACH ROW
EXECUTE FUNCTION fyp_25_s4_20.set_updated_on();

-- Only 1 REGISTER event per product
CREATE UNIQUE INDEX IF NOT EXISTS ux_blockchain_node_register_once
ON fyp_25_s4_20.blockchain_node (product_id)
WHERE event = 'REGISTER';

-- CREATE UNIQUE INDEX IF NOT EXISTS ux_product_product_pda
-- ON fyp_25_s4_20.product (product_pda)
-- WHERE product_pda IS NOT NULL AND product_pda <> '';

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_tx_hash
ON fyp_25_s4_20.product (tx_hash)
WHERE tx_hash IS NOT NULL AND tx_hash <> '';

-- product_pda should be unique when present
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_product_pda
ON fyp_25_s4_20.product (product_pda)
WHERE product_pda IS NOT NULL;

ALTER TABLE fyp_25_s4_20.product
ADD CONSTRAINT product_product_pda_unique UNIQUE (product_pda);





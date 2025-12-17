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
    STATUS product_status NOT NULL,
    model TEXT,
    batch_no TEXT,
    category TEXT,
    manufacture_date DATE,
    description TEXT,
    registered_on TIMESTAMP DEFAULT NOW(),
    tx_hash TEXT
);

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
    
    -- Sender info
    from_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    from_public_key TEXT NOT NULL,
    
    -- Receiver info
    to_user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    to_public_key TEXT NOT NULL,
    
    -- Product
    product_id INT NOT NULL REFERENCES product(product_id) ON DELETE CASCADE,
    
    -- Blockchain data
    block_slot BIGINT NOT NULL, 
    created_on TIMESTAMP DEFAULT NOW()
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
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

CREATE TYPE transaction_action AS ENUM ('create', 'transfer', 'update');

CREATE TYPE transaction_status AS ENUM('pending', 'confirmed', 'failed');

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
    created_on TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- Product Table
-- ===========================
CREATE TABLE IF NOT EXISTS product (
    product_id SERIAL PRIMARY KEY,
    registered_by INT REFERENCES users(user_id) ON DELETE
    SET NULL,
        serial_no TEXT NOT NULL UNIQUE,
        qr_code BYTEA UNIQUE,
        STATUS product_status NOT NULL,
        model TEXT,
        batch_no TEXT,
        category TEXT,
        manufacture_date DATE,
        description TEXT,
        registered_on TIMESTAMP DEFAULT NOW()
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
    onchain_tx_id SERIAL PRIMARY KEY,
    tx_hash TEXT NOT NULL,
    -- prev_tx_hash TEXT, -- Need to find the previous transaction to put into the new one
    -- Sender info
    from_user_id INT REFERENCES users(user_id) ON DELETE
    SET NULL,
        from_public_key TEXT NOT NULL,
        -- Receiver info
        to_user_id INT REFERENCES users(user_id) ON DELETE
    SET NULL,
        to_public_key TEXT,
        product_id INT REFERENCES product(product_id),
        action_type transaction_action,
        STATUS transaction_status,
        block_slot BIGINT,
        created_on TIMESTAMP DEFAULT NOW(),
        -- Constraint: public_key must match user's public_key
        CONSTRAINT check_from_key_matches CHECK (
            from_user_id IS NULL
            OR from_public_key = (
                SELECT public_key
                FROM users
                WHERE user_id = from_user_id
            )
        ),
        CONSTRAINT check_to_key_matches CHECK (
            to_user_id IS NULL
            OR to_public_key = (
                SELECT public_key
                FROM users
                WHERE user_id = to_user_id
            )
        )
);

-- ===========================
-- Ownership Table
-- ===========================
CREATE TABLE IF NOT EXISTS ownership (
    ownership_id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    owner_public_key TEXT,
    product_id INT REFERENCES product(product_id) ON DELETE CASCADE,
    start_on TIMESTAMP DEFAULT NOW(),
    end_on TIMESTAMP NULL,
    -- Constraint: public_key must match user's public_key
    CONSTRAINT check_from_key_matches CHECK (
        owner_id IS NULL
        OR owner_public_key = (
            SELECT public_key
            FROM users
            WHERE user_id = owner_id
        )
    )
);

-- Ensure only one current owner per product at each time period
CREATE UNIQUE INDEX unique_current_owner ON ownership(product_id)
WHERE end_on IS NULL;

-- ===========================
-- Review Table
-- ===========================
CREATE TABLE IF NOT EXISTS review (
    review_id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    author_id INT REFERENCES users(user_id) ON DELETE
    SET NULL,
        rating INT CHECK (
            rating BETWEEN 1 AND 5
        ),
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
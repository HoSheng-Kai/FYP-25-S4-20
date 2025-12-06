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
    currency TEXT,
    STATUS availability NOT NULL,
    created_on TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- Blockchain Node Table
-- ===========================
CREATE TABLE IF NOT EXISTS blockchain_node (
    onchain_tx_id SERIAL PRIMARY KEY,
    prev_tx_hash TEXT,
    tx_hash TEXT,
    STATUS TEXT,
    created_on TIMESTAMP DEFAULT NOW()
);

-- ===========================
-- Ownership Table
-- ===========================
CREATE TABLE IF NOT EXISTS ownership (
    ownership_id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INT REFERENCES product(product_id) ON DELETE CASCADE,
    onchain_tx_id INT REFERENCES blockchain_node(onchain_tx_id) ON DELETE
    SET NULL,
        start_on TIMESTAMP DEFAULT NOW(),
        end_on TIMESTAMP NULL
);

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
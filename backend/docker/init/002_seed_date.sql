SET search_path TO fyp_25_s4_20;

-- ===========================
-- Insert Users
-- ===========================
INSERT INTO users (username, password_hash, email, role_id)
VALUES (
        'admin_user',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'admin@example.com',
        'admin'
    ),
    (
        'nike_manufacturer',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'nike@manufacturer.com',
        'manufacturer'
    ),
    (
        'adidas_manufacturer',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'adidas@manufacturer.com',
        'manufacturer'
    ),
    (
        'global_distributor',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'global@distributor.com',
        'distributor'
    ),
    (
        'asia_distributor',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'asia@distributor.com',
        'distributor'
    ),
    (
        'sports_retailer',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'sports@retailer.com',
        'retailer'
    ),
    (
        'fashion_retailer',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'fashion@retailer.com',
        'retailer'
    ),
    (
        'john_consumer',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'john@consumer.com',
        'consumer'
    ),
    (
        'sarah_consumer',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'sarah@consumer.com',
        'consumer'
    ),
    (
        'mike_consumer',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr9O1em5K',
        'mike@consumer.com',
        'consumer'
    );

-- ===========================
-- Insert Products (now with status field)
-- ===========================
INSERT INTO product (
        registered_by,
        serial_no,
        qr_code,
        STATUS,
        model,
        registered_on
    )
VALUES (
        2,
        'NIKE-AIR-001',
        E'\\x89504e470d0a1a0a',
        'verified',
        'Nike Air Max 270',
        '2024-01-15 10:30:00'
    ),
    (
        2,
        'NIKE-ZOOM-002',
        E'\\x89504e470d0a1a0b',
        'verified',
        'Nike Zoom Pegasus',
        '2024-01-20 14:20:00'
    ),
    (
        2,
        'NIKE-REACT-003',
        E'\\x89504e470d0a1a0c',
        'verified',
        'Nike React Infinity',
        '2024-02-05 09:15:00'
    ),
    (
        3,
        'ADIDAS-ULTRA-001',
        E'\\x89504e470d0a1a0d',
        'verified',
        'Adidas Ultraboost',
        '2024-01-25 11:00:00'
    ),
    (
        3,
        'ADIDAS-NMD-002',
        E'\\x89504e470d0a1a0e',
        'registered',
        'Adidas NMD R1',
        '2024-02-10 16:45:00'
    ),
    (
        3,
        'ADIDAS-SUPER-003',
        E'\\x89504e470d0a1a0f',
        'verified',
        'Adidas Superstar',
        '2024-02-15 13:30:00'
    ),
    (
        2,
        'NIKE-DUNK-004',
        E'\\x89504e470d0a1a10',
        'verified',
        'Nike Dunk Low',
        '2024-03-01 10:00:00'
    ),
    (
        3,
        'ADIDAS-STAN-004',
        E'\\x89504e470d0a1a11',
        'suspicious',
        'Adidas Stan Smith',
        '2024-03-05 15:20:00'
    );

-- ===========================
-- Insert Product Listings (currency still TEXT for now)
-- ===========================
INSERT INTO product_listing (
        product_id,
        seller_id,
        price,
        currency,
        STATUS,
        created_on
    )
VALUES (
        1,
        4,
        150.00,
        'USD',
        'sold',
        '2024-01-16 08:00:00'
    ),
    (
        2,
        5,
        140.00,
        'USD',
        'sold',
        '2024-01-21 09:30:00'
    ),
    (
        3,
        6,
        215.50,
        'SGD',
        'available',
        '2024-02-06 10:15:00'
    ),
    (
        4,
        4,
        180.00,
        'USD',
        'sold',
        '2024-01-26 11:45:00'
    ),
    (
        5,
        5,
        175.00,
        'SGD',
        'reserved',
        '2024-02-11 14:00:00'
    ),
    (
        6,
        6,
        120.00,
        'EUR',
        'available',
        '2024-02-16 12:30:00'
    ),
    (
        7,
        6,
        120.00,
        'USD',
        'sold',
        '2024-03-02 09:00:00'
    ),
    (
        8,
        5,
        115.00,
        'SGD',
        'available',
        '2024-03-06 16:00:00'
    );

-- ===========================
-- Insert Blockchain Transactions (without owner_id reference)
-- ===========================
INSERT INTO blockchain_node (prev_tx_hash, tx_hash, STATUS, created_on)
VALUES -- Product 1 chain
    (
        NULL,
        '0x1a2b3c4d5e6f7g8h9i0j',
        'confirmed',
        '2024-01-15 10:30:00'
    ),
    (
        '0x1a2b3c4d5e6f7g8h9i0j',
        '0x2b3c4d5e6f7g8h9i0j1k',
        'confirmed',
        '2024-01-16 08:00:00'
    ),
    (
        '0x2b3c4d5e6f7g8h9i0j1k',
        '0x3c4d5e6f7g8h9i0j1k2l',
        'confirmed',
        '2024-01-18 14:00:00'
    ),
    (
        '0x3c4d5e6f7g8h9i0j1k2l',
        '0x4d5e6f7g8h9i0j1k2l3m',
        'confirmed',
        '2024-01-22 10:00:00'
    ),
    -- Product 2 chain
    (
        NULL,
        '0x5e6f7g8h9i0j1k2l3m4n',
        'confirmed',
        '2024-01-20 14:20:00'
    ),
    (
        '0x5e6f7g8h9i0j1k2l3m4n',
        '0x6f7g8h9i0j1k2l3m4n5o',
        'confirmed',
        '2024-01-21 09:30:00'
    ),
    (
        '0x6f7g8h9i0j1k2l3m4n5o',
        '0x7g8h9i0j1k2l3m4n5o6p',
        'confirmed',
        '2024-01-25 11:00:00'
    ),
    -- Product 3 chain
    (
        NULL,
        '0x8h9i0j1k2l3m4n5o6p7q',
        'confirmed',
        '2024-02-05 09:15:00'
    ),
    (
        '0x8h9i0j1k2l3m4n5o6p7q',
        '0x9i0j1k2l3m4n5o6p7q8r',
        'confirmed',
        '2024-02-06 10:15:00'
    ),
    -- Product 4 chain
    (
        NULL,
        '0xa0b1c2d3e4f5g6h7i8j9',
        'confirmed',
        '2024-01-25 11:00:00'
    ),
    (
        '0xa0b1c2d3e4f5g6h7i8j9',
        '0xb1c2d3e4f5g6h7i8j9k0',
        'confirmed',
        '2024-01-26 11:45:00'
    ),
    (
        '0xb1c2d3e4f5g6h7i8j9k0',
        '0xc2d3e4f5g6h7i8j9k0l1',
        'confirmed',
        '2024-01-30 13:00:00'
    );

-- ===========================
-- Insert Ownership Records (now with onchain_tx_id)
-- ===========================
INSERT INTO ownership (
        owner_id,
        product_id,
        onchain_tx_id,
        start_on,
        end_on
    )
VALUES -- Product 1 ownership chain
    (
        2,
        1,
        1,
        '2024-01-15 10:30:00',
        '2024-01-16 08:00:00'
    ),
    (
        4,
        1,
        2,
        '2024-01-16 08:00:00',
        '2024-01-18 14:00:00'
    ),
    (
        6,
        1,
        3,
        '2024-01-18 14:00:00',
        '2024-01-22 10:00:00'
    ),
    (8, 1, 4, '2024-01-22 10:00:00', NULL),
    -- Product 2 ownership chain
    (
        2,
        2,
        5,
        '2024-01-20 14:20:00',
        '2024-01-21 09:30:00'
    ),
    (
        5,
        2,
        6,
        '2024-01-21 09:30:00',
        '2024-01-25 11:00:00'
    ),
    (9, 2, 7, '2024-01-25 11:00:00', NULL),
    -- Product 3 ownership chain (still with retailer)
    (
        2,
        3,
        8,
        '2024-02-05 09:15:00',
        '2024-02-06 10:15:00'
    ),
    (6, 3, 9, '2024-02-06 10:15:00', NULL),
    -- Product 4 ownership chain
    (
        3,
        4,
        10,
        '2024-01-25 11:00:00',
        '2024-01-26 11:45:00'
    ),
    (
        4,
        4,
        11,
        '2024-01-26 11:45:00',
        '2024-01-30 13:00:00'
    ),
    (8, 4, 12, '2024-01-30 13:00:00', NULL),
    -- Product 5 ownership chain (reserved) - no blockchain yet
    (
        3,
        5,
        NULL,
        '2024-02-10 16:45:00',
        '2024-02-11 14:00:00'
    ),
    (5, 5, NULL, '2024-02-11 14:00:00', NULL),
    -- Product 6 ownership chain (available at retailer) - no blockchain yet
    (
        3,
        6,
        NULL,
        '2024-02-15 13:30:00',
        '2024-02-16 12:30:00'
    ),
    (6, 6, NULL, '2024-02-16 12:30:00', NULL),
    -- Product 7 ownership chain - no blockchain yet
    (
        2,
        7,
        NULL,
        '2024-03-01 10:00:00',
        '2024-03-02 09:00:00'
    ),
    (
        6,
        7,
        NULL,
        '2024-03-02 09:00:00',
        '2024-03-04 15:00:00'
    ),
    (10, 7, NULL, '2024-03-04 15:00:00', NULL),
    -- Product 8 ownership chain (suspicious product) - no blockchain yet
    (
        3,
        8,
        NULL,
        '2024-03-05 15:20:00',
        '2024-03-06 16:00:00'
    ),
    (5, 8, NULL, '2024-03-06 16:00:00', NULL);

-- ===========================
-- Insert Reviews
-- ===========================
INSERT INTO review (owner_id, author_id, rating, COMMENT, created_on)
VALUES (
        6,
        8,
        5,
        'Amazing product! The Nike Air Max 270 exceeded my expectations. Very comfortable and stylish.',
        '2024-01-23 15:30:00'
    ),
    (
        7,
        9,
        4,
        'Great shoes, but took a while to break in. Overall happy with the Nike Zoom Pegasus.',
        '2024-01-26 18:45:00'
    ),
    (
        4,
        8,
        5,
        'Absolutely love the Adidas Ultraboost! Best running shoes I have ever owned.',
        '2024-02-01 12:00:00'
    ),
    (
        2,
        8,
        5,
        'Excellent service from nike_manufacturer. Product arrived exactly as described.',
        '2024-01-24 09:15:00'
    ),
    (
        5,
        9,
        4,
        'Good experience with asia_distributor. Fast shipping and secure packaging.',
        '2024-01-27 14:30:00'
    ),
    (
        6,
        10,
        5,
        'Sports retailer provided outstanding customer service. Highly recommend!',
        '2024-03-05 16:20:00'
    ),
    (
        4,
        10,
        4,
        'Product is okay, but expected better quality for the price. Still wearable.',
        '2024-03-10 11:45:00'
    );

-- ===========================
-- Insert Notifications
-- ===========================
INSERT INTO notification (user_id, title, message, is_read, created_on)
VALUES
  (
    8,
    'Product Verified',
    'Your product NIKE-AIR-001 has been verified as authentic.',
    FALSE,
    '2024-03-10 10:00:00'
  ),
  (
    8,
    'Ownership Updated',
    'Ownership of product NIKE-AIR-001 was transferred to you.',
    TRUE,
    '2024-03-08 09:00:00'
  );
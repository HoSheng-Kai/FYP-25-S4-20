-- SET search_path TO fyp_25_s4_20;
SET search_path TO fyp_25_s4_20, public;

-- UPDATE product
-- SET qr_code = NULL;

-- SELECT 
--     product_id, 
--     serial_no, 
--     qr_code IS NOT NULL AS has_qr
-- FROM product;

-- ===========================
-- Insert Users (base58 private keys, base58 public keys)
-- ===========================
-- User IDs will be:
-- 1: admin_user
-- 2: nike_manufacturer
-- 3: adidas_manufacturer
-- 4: global_distributor
-- 5: asia_distributor
-- 6: sports_retailer
-- 7: fashion_retailer
-- 8: john_consumer
-- 9: sarah_consumer
-- 10: mike_consumer
-- BEGIN;

-- ===========================
-- Insert Users
-- ===========================
INSERT INTO users (
  username,
  password_hash,
  email,
  role_id,
  private_key,
  public_key,
  verified,
  banned
)
VALUES
  ('admin_user','admin123','admin@example.com','admin',
   '5Jn1PsY9FYjYtpjfLaivRW5dSdkCsDxDnmkCn8MXkGFmnPA3NqFSoEww45mm4ukeFwvGFwG9akagGF2cLCofGsnp',
   'pR9HgGJrxkFTVebFhYAoq4URkLti4tph9f7Sxvgrpzc', TRUE, FALSE),
  
-- unverify test case
--   ('nike_manufacturer','nike123','nike@manufacturer.com','manufacturer',
--    '5X6x3cV94w94qjYR62UXLTAVA63Yt2V7dFY3RX41u4hWT1WAPgfh7WXv79ujJw5q9RBT4J7otvmq1PZ6xJHN2kVH',
--    '4Vu8gxiWGHQYF7jfj3qiFUQmPQpyZNwvpmiLBXJ7gA4b', FALSE, FALSE),

  ('phantom_wallet_1','phantom_password','phantom@mail1.com','manufacturer',
    '5X6x3cV94w94qjYR62UXLTAVA63Yt2V7dFY3RX41u4hWT1WAPgfh7WXv79ujJw5q9RBT4J7otvmq1PZ6xJHN2kVH',
    '4Vu8gxiWGHQYF7jfj3qiFUQmPQpyZNwvpmiLBXJ7gA4b', TRUE, FALSE);

--      ('nike_manufacturer','nike123','nike@manufacturer.com','manufacturer',
--    '3A3nx4qQQCy4GwKgexB9weV3X9ZSZ48N9kVEquAEzNyb1iMfjHYc3s2ERYhdfTHvdenvAfpZd7eB5kpHpcdc3F3B',
--    '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so', FALSE),
   
  ('adidas_manufacturer','adidas123','adidas@manufacturer.com','manufacturer',
   '2aW6cVrGAGsTv9UXFMpcDRhb9iiPcfxgR1jHoBcYKKTFoFcZYjazQSsQtQEfHhar3MukdKz7jUaWCNVKQaYbgKbp',
   'DrjZ88F3Ahm93CY2TFkkyUe8Ko7YJnvmv2Tq6zPuWvTc', FALSE, FALSE),

  ('global_distributor','global123','global@distributor.com','distributor',
   '66X4Fdd7XwpbBrYSRYda3dpQsmaWhcbV9qTu9aD12fcdKa7zkHs5nrzHebWspuzBgDMGL75Rwu4QBqieULwAtvvb',
   'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh', TRUE, FALSE),

  ('asia_distributor','asia123','asia@distributor.com','distributor',
   '4oSPuV9peRKqVQJ9zd8s2p8Mj3TPznGtBEjTZwSHM4gLuwojDGbTb3v7FiPpisfXWf6Bdv4AQhLSVMpKP4EwL3zz',
   'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg', TRUE, FALSE),

  ('sports_retailer','sports123','sports@retailer.com','retailer',
   '5VKwRzTi4ou39Rf9xASUFHfvXhdXZgdiQyXod84BFrmGsEe86qK7bpc5TcwajKaxsLXMdu6HcxzGzpzW7SZfPnDx',
   '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ', TRUE, FALSE),

-- banned test case
  ('fashion_retailer','fashion123','fashion@retailer.com','retailer',
   '2KFueTrHAsahgPPRApK6Ci8grXY1Nae6ZBUcmD3X9LWke31yjLUkdyHKvs4BUBPvmjn78ehy29gC1yJyhrD2DeoP',
   '3NdBsPtC3cXjo16jsTuJxbBXhRFWFiWT9kz9wWXHokYd', TRUE, TRUE),

  ('john_consumer','john123','john@consumer.com','consumer',
   '4ucS3Vh1ZYEJxsfzjpJ8uxY6w7dxjptGVCrJpuQv4azCX8xrYjqNHB8gBweFzmCKY4388DamUqnH63KshsHKdFcr',
   'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6', TRUE, FALSE),

  ('sarah_consumer','sarah123','sarah@consumer.com','consumer',
   'g9VEqeoDDGCkSVfq9q89zBu6smRGUzxzh9b8HTEvmehQacsokv76DSFWhk33WvoR4yqookTTGE1rSzxPop5mJv2',
   'G5XcPa1rbhheULPjCvwTGEhkA12fUu8dP4mNG2H9yg9U', TRUE, FALSE),

  ('mike_consumer','mike123','mike@consumer.com','consumer',
   '4NcvkwnkyFBN79bJ643dBSJQ3oqTrpQ98hHqbn1RGoKoFVmdCcqdf1pKnTTApYdf5QmzohQ9phAwaf4RztzfBq25',
   '8Jtmqnz6K2qgNLHhBCjxmrtPceBnRQa1uHNFFNa8Nbid', TRUE, FALSE),
   
  ('phantom_wallet_1','phantom_password','phantom@mail1.com','consumer',
   '5X6x3cV94w94qjYR62UXLTAVA63Yt2V7dFY3RX41u4hWT1WAPgfh7WXv79ujJw5q9RBT4J7otvmq1PZ6xJHN2kVH',
   '4Vu8gxiWGHQYF7jfj3qiFUQmPQpyZNwvpmiLBXJ7gA4b', TRUE, FALSE);   


-- ===========================
-- Insert Products
-- ===========================
-- Product IDs will be 1-8
INSERT INTO product (
        registered_by,
        serial_no,
        qr_code,
        STATUS,
        model,
        batch_no,
        category,
        manufacture_date,
        description,
        registered_on,
        tx_hash,
        product_pda
    )
VALUES (
        2,
        'NIKE-AIR-001',
        NULL,
        'verified',
        'Nike Air Max 270',
        'BATCH-2024-001',
        'Footwear',
        '2024-01-10',
        'Premium running shoes with Air cushioning technology',
        '2024-01-15 10:30:00',
        NULL,
        NULL
    ),
    (
        2,
        'NIKE-ZOOM-002',
        NULL,
        'verified',
        'Nike Zoom Pegasus',
        'BATCH-2024-002',
        'Footwear',
        '2024-01-15',
        'Lightweight running shoes for daily training',
        '2024-01-20 14:20:00',
        NULL,
        NULL
    ),
    (
        2,
        'NIKE-REACT-003',
        NULL,
        'verified',
        'Nike React Infinity',
        'BATCH-2024-003',
        'Footwear',
        '2024-02-01',
        'High-performance running shoes with React foam',
        '2024-02-05 09:15:00',
        NULL,
        NULL
    ),
    (
        3,
        'ADIDAS-ULTRA-001',
        NULL,
        'verified',
        'Adidas Ultraboost',
        'BATCH-2024-004',
        'Footwear',
        '2024-01-20',
        'Energy-returning running shoes with Boost technology',
        '2024-01-25 11:00:00',
        NULL,
        NULL
    ),
    (
        3,
        'ADIDAS-NMD-002',
        NULL,
        'registered',
        'Adidas NMD R1',
        'BATCH-2024-005',
        'Footwear',
        '2024-02-05',
        'Lifestyle sneakers with modern design',
        '2024-02-10 16:45:00',
        NULL,
        NULL
    ),
    (
        3,
        'ADIDAS-SUPER-003',
        NULL,
        'verified',
        'Adidas Superstar',
        'BATCH-2024-006',
        'Footwear',
        '2024-02-10',
        'Classic shell-toe sneakers',
        '2024-02-15 13:30:00',
        NULL,
        NULL
    ),
    (
        2,
        'NIKE-DUNK-004',
        NULL,
        'verified',
        'Nike Dunk Low',
        'BATCH-2024-007',
        'Footwear',
        '2024-02-25',
        'Iconic basketball-inspired sneakers',
        '2024-03-01 10:00:00',
        NULL,
        NULL
    ),
    (
        3,
        'ADIDAS-STAN-004',
        NULL,
        'suspicious',
        'Adidas Stan Smith',
        'BATCH-2024-008',
        'Footwear',
        '2024-03-01',
        'Timeless tennis-inspired sneakers',
        '2024-03-05 15:20:00',
        NULL,
        NULL
    ),
    -- Product 9: For testing end-tracking feature
    (
        2,
        'NIKE-ENDTRACK-001',
        NULL,
        'verified',
        'Nike End Track Test',
        'BATCH-2024-009',
        'Footwear',
        '2024-03-10',
        'Test product for end-tracking feature - owned by global_distributor',
        '2024-03-10 10:00:00',
        NULL,
        NULL
    );

-- ===========================
-- Insert Product Listings
-- ===========================

-- INSERT INTO fyp_25_s4_20.product (
--   registered_by,
--   serial_no,
--   qr_code,
--   status,
--   model,
--   batch_no,
--   category,
--   manufacture_date,
--   description,
--   registered_on,
--   tx_hash,
--   product_pda
-- )
-- VALUES ($1, $2, NULL, 'registered', $3, $4, $5, $6, $7, NOW(), NULL, NULL)
-- ON CONFLICT (serial_no) DO UPDATE
-- SET
--   -- only allow reuse if SAME manufacturer and still pending (not confirmed on-chain)
--   model = EXCLUDED.model,
--   batch_no = EXCLUDED.batch_no,
--   category = EXCLUDED.category,
--   manufacture_date = EXCLUDED.manufacture_date,
--   description = EXCLUDED.description
-- WHERE
--   fyp_25_s4_20.product.registered_by = EXCLUDED.registered_by
--   AND fyp_25_s4_20.product.tx_hash IS NULL
-- RETURNING
--   product_id, serial_no, model, batch_no, category,
--   manufacture_date, description, status, registered_on, tx_hash, product_pda;

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
-- Insert Blockchain Node Records
-- ===========================
-- Note: Each transaction represents a transfer FROM one user TO another
-- The receiver (to_user_id) becomes the new owner via this transaction
INSERT INTO blockchain_node (
    tx_hash,
    prev_tx_hash,
    from_user_id,
    from_public_key,
    to_user_id,
    to_public_key,
    product_id,
    block_slot,
    created_on
)
VALUES 
-- Product 1: Nike Air Max 270 chain
-- Manufacturer (2) -> Distributor (4)
(
    'tx_p1_mfr_to_dist',
    NULL,
    2,
    '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
    4,
    'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
    1,
    1000001,
    '2024-01-15 10:30:00'
),
-- Distributor (4) -> Retailer (6)
(
    'tx_p1_dist_to_ret',
    'tx_p1_mfr_to_dist',
    4,
    'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
    6,
    '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
    1,
    1000102,
    '2024-01-16 08:00:00'
),
-- Retailer (6) -> Consumer John (8)
(
    'tx_p1_ret_to_cons',
    'tx_p1_dist_to_ret',
    6,
    '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
    8,
    'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
    1,
    1000253,
    '2024-01-18 14:00:00'
),

-- Product 2: Nike Zoom Pegasus chain
-- Manufacturer (2) -> Distributor (5)
(
    'tx_p2_mfr_to_dist',
    NULL,
    2,
    '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
    5,
    'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg',
    2,
    1000550,
    '2024-01-20 14:20:00'
),
-- Distributor (5) -> Consumer Sarah (9)
(
    'tx_p2_dist_to_cons',
    'tx_p2_mfr_to_dist',
    5,
    'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg',
    9,
    'G5XcPa1rbhheULPjCvwTGEhkA12fUu8dP4mNG2H9yg9U',
    2,
    1000631,
    '2024-01-21 09:30:00'
),

-- Product 3: Nike React Infinity chain
-- Manufacturer (2) -> Retailer (6)
(
    'tx_p3_mfr_to_ret',
    NULL,
    2,
    '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
    6,
    '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
    3,
    1001120,
    '2024-02-05 09:15:00'
),

-- Product 4: Adidas Ultraboost chain
-- Manufacturer (3) -> Distributor (4)
(
    'tx_p4_mfr_to_dist',
    NULL,
    3,
    'DrjZ88F3Ahm93CY2TFkkyUe8Ko7YJnvmv2Tq6zPuWvTc',
    4,
    'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
    4,
    1000900,
    '2024-01-25 11:00:00'
),
-- Distributor (4) -> Consumer John (8)
(
    'tx_p4_dist_to_cons',
    'tx_p4_mfr_to_dist',
    4,
    'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
    8,
    'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
    4,
    1000991,
    '2024-01-26 11:45:00'
),

-- Product 7: Nike Dunk Low chain
-- Manufacturer (2) -> Retailer (6)
(
    'tx_p7_mfr_to_ret',
    NULL,
    2,
    '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
    6,
    '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
    7,
    1001850,
    '2024-03-01 10:00:00'
),
-- Retailer (6) -> Consumer Mike (10)
(
    'tx_p7_ret_to_cons',
    'tx_p7_mfr_to_ret',
    6,
    '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
    10,
    '8Jtmqnz6K2qgNLHhBCjxmrtPceBnRQa1uHNFFNa8Nbid',
    7,
    1001931,
    '2024-03-02 09:00:00'
);

-- ===========================
-- Insert Ownership Records (Derived from Blockchain)
-- ===========================
-- IMPORTANT: Ownership is tied to the RECEIVER of a transaction
-- Each tx_hash should map to exactly one ownership record (the new owner)
-- The owner_id and owner_public_key must match the to_user_id and to_public_key from blockchain_node

INSERT INTO ownership (
    owner_id,
    owner_public_key,
    product_id,
    start_on,
    end_on,
    tx_hash
)
VALUES 
-- Product 1: Nike Air Max 270 ownership chain
-- Distributor (4) receives from manufacturer
(
    4,
    'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
    1,
    '2024-01-15 10:30:00',
    '2024-01-16 08:00:00',
    'tx_p1_mfr_to_dist'
),
-- Retailer (6) receives from distributor
(
    6,
    '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
    1,
    '2024-01-16 08:00:00',
    '2024-01-18 14:00:00',
    'tx_p1_dist_to_ret'
),
-- Consumer John (8) receives from retailer - CURRENT OWNER
(
    8,
    'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
    1,
    '2024-01-18 14:00:00',
    NULL,
    'tx_p1_ret_to_cons'
),

-- Product 2: Nike Zoom Pegasus ownership chain
-- Distributor (5) receives from manufacturer
(
    5,
    'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg',
    2,
    '2024-01-20 14:20:00',
    '2024-01-21 09:30:00',
    'tx_p2_mfr_to_dist'
),
-- Consumer Sarah (9) receives from distributor - CURRENT OWNER
(
    9,
    'G5XcPa1rbhheULPjCvwTGEhkA12fUu8dP4mNG2H9yg9U',
    2,
    '2024-01-21 09:30:00',
    NULL,
    'tx_p2_dist_to_cons'
),

-- Product 3: Nike React Infinity ownership chain
-- Retailer (6) receives from manufacturer - CURRENT OWNER
(
    6,
    '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
    3,
    '2024-02-05 09:15:00',
    NULL,
    'tx_p3_mfr_to_ret'
),

-- Product 4: Adidas Ultraboost ownership chain
-- Distributor (4) receives from manufacturer
(
    4,
    'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
    4,
    '2024-01-25 11:00:00',
    '2024-01-26 11:45:00',
    'tx_p4_mfr_to_dist'
),
-- Consumer John (8) receives from distributor - CURRENT OWNER
(
    8,
    'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
    4,
    '2024-01-26 11:45:00',
    NULL,
    'tx_p4_dist_to_cons'
),

-- Product 7: Nike Dunk Low ownership chain
-- Retailer (6) receives from manufacturer
(
    6,
    '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
    7,
    '2024-03-01 10:00:00',
    '2024-03-02 09:00:00',
    'tx_p7_mfr_to_ret'
),
-- Consumer Mike (10) receives from retailer - CURRENT OWNER
(
    10,
    '8Jtmqnz6K2qgNLHhBCjxmrtPceBnRQa1uHNFFNa8Nbid',
    7,
    '2024-03-02 09:00:00',
    NULL,
    'tx_p7_ret_to_cons'
);


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
        5,
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
INSERT INTO fyp_25_s4_20.notification
  (user_id, title, message, is_read, created_on, product_id, tx_hash)
VALUES
  (2, 'Product Registration',
   'Your product NIKE-AIR-001 has been successfully registered on the blockchain. tx=seed_tx_ni_ke_001',
   FALSE, '2024-01-15 10:35:00', 1, 'seed_tx_ni_ke_001'),

  (8, 'Ownership Updated',
   'Ownership of product NIKE-AIR-001 was transferred to you. tx=seed_tx_p1_ret_to_cons',
   TRUE, '2024-03-08 09:00:00', 1, 'seed_tx_p1_ret_to_cons'),

  (8, 'Product Verified',
   'Your product NIKE-AIR-001 has been verified as authentic.',
   FALSE, '2024-03-10 10:00:00', 1, NULL),

  (6, 'Suspicious Activity',
   'Product ADIDAS-STAN-004 has been flagged as suspicious. Please review.',
   FALSE, '2024-03-05 15:30:00', 8, NULL)

ON CONFLICT ON CONSTRAINT notification_user_product_tx_uniq
DO NOTHING;


-- COMMIT;
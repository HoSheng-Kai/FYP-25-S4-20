SET search_path TO fyp_25_s4_20;

-- ===========================
-- Insert Users (base58 private keys, base58 public keys)
-- ===========================
INSERT INTO users (
        username,
        password_hash,
        email,
        role_id,
        private_key,
        public_key
    )
VALUES (
        'admin_user',
        'admin123',
        'admin@example.com',
        'admin',
        '5Jn1PsY9FYjYtpjfLaivRW5dSdkCsDxDnmkCn8MXkGFmnPA3NqFSoEww45mm4ukeFwvGFwG9akagGF2cLCofGsnp',
        'pR9HgGJrxkFTVebFhYAoq4URkLti4tph9f7Sxvgrpzc'
    ),
    (
        'nike_manufacturer',
        'nike123',
        'nike@manufacturer.com',
        'manufacturer',
        '3A3nx4qQQCy4GwKgexB9weV3X9ZSZ48N9kVEquAEzNyb1iMfjHYc3s2ERYhdfTHvdenvAfpZd7eB5kpHpcdc3F3B',
        '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so'
    ),
    (
        'adidas_manufacturer',
        'adidas123',
        'adidas@manufacturer.com',
        'manufacturer',
        '2aW6cVrGAGsTv9UXFMpcDRhb9iiPcfxgR1jHoBcYKKTFoFcZYjazQSsQtQEfHhar3MukdKz7jUaWCNVKQaYbgKbp',
        'DrjZ88F3Ahm93CY2TFkkyUe8Ko7YJnvmv2Tq6zPuWvTc'
    ),
    (
        'global_distributor',
        'global123',
        'global@distributor.com',
        'distributor',
        '66X4Fdd7XwpbBrYSRYda3dpQsmaWhcbV9qTu9aD12fcdKa7zkHs5nrzHebWspuzBgDMGL75Rwu4QBqieULwAtvvb',
        'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh'
    ),
    (
        'asia_distributor',
        'asia123',
        'asia@distributor.com',
        'distributor',
        '4oSPuV9peRKqVQJ9zd8s2p8Mj3TPznGtBEjTZwSHM4gLuwojDGbTb3v7FiPpisfXWf6Bdv4AQhLSVMpKP4EwL3zz',
        'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg'
    ),
    (
        'sports_retailer',
        'sports123',
        'sports@retailer.com',
        'retailer',
        '5VKwRzTi4ou39Rf9xASUFHfvXhdXZgdiQyXod84BFrmGsEe86qK7bpc5TcwajKaxsLXMdu6HcxzGzpzW7SZfPnDx',
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ'
    ),
    (
        'fashion_retailer',
        'fashion123',
        'fashion@retailer.com',
        'retailer',
        '2KFueTrHAsahgPPRApK6Ci8grXY1Nae6ZBUcmD3X9LWke31yjLUkdyHKvs4BUBPvmjn78ehy29gC1yJyhrD2DeoP',
        '3NdBsPtC3cXjo16jsTuJxbBXhRFWFiWT9kz9wWXHokYd'
    ),
    (
        'john_consumer',
        'john123',
        'john@consumer.com',
        'consumer',
        '4ucS3Vh1ZYEJxsfzjpJ8uxY6w7dxjptGVCrJpuQv4azCX8xrYjqNHB8gBweFzmCKY4388DamUqnH63KshsHKdFcr',
        'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6'
    ),
    (
        'sarah_consumer',
        'sarah123',
        'sarah@consumer.com',
        'consumer',
        'g9VEqeoDDGCkSVfq9q89zBu6smRGUzxzh9b8HTEvmehQacsokv76DSFWhk33WvoR4yqookTTGE1rSzxPop5mJv2',
        'G5XcPa1rbhheULPjCvwTGEhkA12fUu8dP4mNG2H9yg9U'
    ),
    (
        'mike_consumer',
        'mike123',
        'mike@consumer.com',
        'consumer',
        '4NcvkwnkyFBN79bJ643dBSJQ3oqTrpQ98hHqbn1RGoKoFVmdCcqdf1pKnTTApYdf5QmzohQ9phAwaf4RztzfBq25',
        '8Jtmqnz6K2qgNLHhBCjxmrtPceBnRQa1uHNFFNa8Nbid'
    );

-- ===========================
-- Insert Products
-- ===========================
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
        registered_on
    )
VALUES (
        2,
        'NIKE-AIR-001',
        E'\x89504e470d0a1a0a',
        'verified',
        'Nike Air Max 270',
        'BATCH-2024-001',
        'Footwear',
        '2024-01-10',
        'Premium running shoes with Air cushioning technology',
        '2024-01-15 10:30:00'
    ),
    (
        2,
        'NIKE-ZOOM-002',
        E'\x89504e470d0a1a0b',
        'verified',
        'Nike Zoom Pegasus',
        'BATCH-2024-002',
        'Footwear',
        '2024-01-15',
        'Lightweight running shoes for daily training',
        '2024-01-20 14:20:00'
    ),
    (
        2,
        'NIKE-REACT-003',
        E'\x89504e470d0a1a0c',
        'verified',
        'Nike React Infinity',
        'BATCH-2024-003',
        'Footwear',
        '2024-02-01',
        'High-performance running shoes with React foam',
        '2024-02-05 09:15:00'
    ),
    (
        3,
        'ADIDAS-ULTRA-001',
        E'\x89504e470d0a1a0d',
        'verified',
        'Adidas Ultraboost',
        'BATCH-2024-004',
        'Footwear',
        '2024-01-20',
        'Energy-returning running shoes with Boost technology',
        '2024-01-25 11:00:00'
    ),
    (
        3,
        'ADIDAS-NMD-002',
        E'\x89504e470d0a1a0e',
        'registered',
        'Adidas NMD R1',
        'BATCH-2024-005',
        'Footwear',
        '2024-02-05',
        'Lifestyle sneakers with modern design',
        '2024-02-10 16:45:00'
    ),
    (
        3,
        'ADIDAS-SUPER-003',
        E'\x89504e470d0a1a0f',
        'verified',
        'Adidas Superstar',
        'BATCH-2024-006',
        'Footwear',
        '2024-02-10',
        'Classic shell-toe sneakers',
        '2024-02-15 13:30:00'
    ),
    (
        2,
        'NIKE-DUNK-004',
        E'\x89504e470d0a1a10',
        'verified',
        'Nike Dunk Low',
        'BATCH-2024-007',
        'Footwear',
        '2024-02-25',
        'Iconic basketball-inspired sneakers',
        '2024-03-01 10:00:00'
    ),
    (
        3,
        'ADIDAS-STAN-004',
        E'\x89504e470d0a1a11',
        'suspicious',
        'Adidas Stan Smith',
        'BATCH-2024-008',
        'Footwear',
        '2024-03-01',
        'Timeless tennis-inspired sneakers',
        '2024-03-05 15:20:00'
    );

-- ===========================
-- Insert Product Listings
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
-- Insert Blockchain Transactions
-- ===========================
INSERT INTO blockchain_node (
        tx_hash,
        from_user_id,
        from_public_key,
        to_user_id,
        to_public_key,
        product_id,
        action_type,
        STATUS,
        block_slot,
        created_on
    )
VALUES -- Product 1: Nike Air Max 270 chain (manufacturer -> distributor -> retailer -> consumer)
    (
        '0x1a2b3c4d5e6f7g8h9i0j',
        2,
        '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
        4,
        'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
        1,
        'create',
        'confirmed',
        1000001,
        '2024-01-15 10:30:00'
    ),
    (
        '0x2b3c4d5e6f7g8h9i0j1k',
        4,
        'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        1,
        'transfer',
        'confirmed',
        1000102,
        '2024-01-16 08:00:00'
    ),
    (
        '0x3c4d5e6f7g8h9i0j1k2l',
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        8,
        'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
        1,
        'transfer',
        'confirmed',
        1000253,
        '2024-01-18 14:00:00'
    ),
    (
        '0x4d5e6f7g8h9i0j1k2l3m',
        8,
        'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
        8,
        'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
        1,
        'update',
        'confirmed',
        1000424,
        '2024-01-22 10:00:00'
    ),
    -- Product 2: Nike Zoom Pegasus chain (manufacturer -> distributor -> consumer)
    (
        '0x5e6f7g8h9i0j1k2l3m4n',
        2,
        '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
        5,
        'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg',
        2,
        'create',
        'confirmed',
        1000550,
        '2024-01-20 14:20:00'
    ),
    (
        '0x6f7g8h9i0j1k2l3m4n5o',
        5,
        'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg',
        9,
        'G5XcPa1rbhheULPjCvwTGEhkA12fUu8dP4mNG2H9yg9U',
        2,
        'transfer',
        'confirmed',
        1000631,
        '2024-01-21 09:30:00'
    ),
    (
        '0x7g8h9i0j1k2l3m4n5o6p',
        9,
        'G5XcPa1rbhheULPjCvwTGEhkA12fUu8dP4mNG2H9yg9U',
        9,
        'G5XcPa1rbhheULPjCvwTGEhkA12fUu8dP4mNG2H9yg9U',
        2,
        'update',
        'confirmed',
        1000852,
        '2024-01-25 11:00:00'
    ),
    -- Product 3: Nike React Infinity chain (manufacturer -> retailer)
    (
        '0x8h9i0j1k2l3m4n5o6p7q',
        2,
        '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        3,
        'create',
        'confirmed',
        1001120,
        '2024-02-05 09:15:00'
    ),
    (
        '0x9i0j1k2l3m4n5o6p7q8r',
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        3,
        'update',
        'confirmed',
        1001221,
        '2024-02-06 10:15:00'
    ),
    -- Product 4: Adidas Ultraboost chain (manufacturer -> distributor -> consumer)
    (
        '0xa0b1c2d3e4f5g6h7i8j9',
        3,
        'DrjZ88F3Ahm93CY2TFkkyUe8Ko7YJnvmv2Tq6zPuWvTc',
        4,
        'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
        4,
        'create',
        'confirmed',
        1000900,
        '2024-01-25 11:00:00'
    ),
    (
        '0xb1c2d3e4f5g6h7i8j9k0',
        4,
        'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
        8,
        'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
        4,
        'transfer',
        'confirmed',
        1000991,
        '2024-01-26 11:45:00'
    ),
    (
        '0xc2d3e4f5g6h7i8j9k0l1',
        8,
        'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
        8,
        'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
        4,
        'update',
        'confirmed',
        1001142,
        '2024-01-30 13:00:00'
    ),
    -- Product 7: Nike Dunk Low chain (manufacturer -> retailer -> consumer)
    (
        '0xd3e4f5g6h7i8j9k0l1m2',
        2,
        '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        7,
        'create',
        'confirmed',
        1001850,
        '2024-03-01 10:00:00'
    ),
    (
        '0xe4f5g6h7i8j9k0l1m2n3',
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        10,
        '8Jtmqnz6K2qgNLHhBCjxmrtPceBnRQa1uHNFFNa8Nbid',
        7,
        'transfer',
        'confirmed',
        1001931,
        '2024-03-02 09:00:00'
    );

-- ===========================
-- Insert Ownership Records
-- ===========================
INSERT INTO ownership (
        owner_id,
        owner_public_key,
        product_id,
        start_on,
        end_on
    )
VALUES -- Product 1: Nike Air Max 270 ownership chain
    (
        2,
        '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
        1,
        '2024-01-15 10:30:00',
        '2024-01-16 08:00:00'
    ),
    (
        4,
        'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
        1,
        '2024-01-16 08:00:00',
        '2024-01-18 14:00:00'
    ),
    (
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        1,
        '2024-01-18 14:00:00',
        '2024-01-22 10:00:00'
    ),
    (
        8,
        'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
        1,
        '2024-01-22 10:00:00',
        NULL
    ),
    -- Product 2: Nike Zoom Pegasus ownership chain
    (
        2,
        '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
        2,
        '2024-01-20 14:20:00',
        '2024-01-21 09:30:00'
    ),
    (
        5,
        'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg',
        2,
        '2024-01-21 09:30:00',
        '2024-01-25 11:00:00'
    ),
    (
        9,
        'G5XcPa1rbhheULPjCvwTGEhkA12fUu8dP4mNG2H9yg9U',
        2,
        '2024-01-25 11:00:00',
        NULL
    ),
    -- Product 3: Nike React Infinity ownership chain (still with retailer)
    (
        2,
        '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
        3,
        '2024-02-05 09:15:00',
        '2024-02-06 10:15:00'
    ),
    (
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        3,
        '2024-02-06 10:15:00',
        NULL
    ),
    -- Product 4: Adidas Ultraboost ownership chain
    (
        3,
        'DrjZ88F3Ahm93CY2TFkkyUe8Ko7YJnvmv2Tq6zPuWvTc',
        4,
        '2024-01-25 11:00:00',
        '2024-01-26 11:45:00'
    ),
    (
        4,
        'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh',
        4,
        '2024-01-26 11:45:00',
        '2024-01-30 13:00:00'
    ),
    (
        8,
        'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6',
        4,
        '2024-01-30 13:00:00',
        NULL
    ),
    -- Product 5: Adidas NMD R1 ownership chain (reserved, no blockchain yet)
    (
        3,
        'DrjZ88F3Ahm93CY2TFkkyUe8Ko7YJnvmv2Tq6zPuWvTc',
        5,
        '2024-02-10 16:45:00',
        '2024-02-11 14:00:00'
    ),
    (
        5,
        'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg',
        5,
        '2024-02-11 14:00:00',
        NULL
    ),
    -- Product 6: Adidas Superstar ownership chain (available at retailer, no blockchain yet)
    (
        3,
        'DrjZ88F3Ahm93CY2TFkkyUe8Ko7YJnvmv2Tq6zPuWvTc',
        6,
        '2024-02-15 13:30:00',
        '2024-02-16 12:30:00'
    ),
    (
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        6,
        '2024-02-16 12:30:00',
        NULL
    ),
    -- Product 7: Nike Dunk Low ownership chain
    (
        2,
        '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so',
        7,
        '2024-03-01 10:00:00',
        '2024-03-02 09:00:00'
    ),
    (
        6,
        '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ',
        7,
        '2024-03-02 09:00:00',
        '2024-03-04 15:00:00'
    ),
    (
        10,
        '8Jtmqnz6K2qgNLHhBCjxmrtPceBnRQa1uHNFFNa8Nbid',
        7,
        '2024-03-04 15:00:00',
        NULL
    ),
    -- Product 8: Adidas Stan Smith ownership chain (suspicious product, no blockchain yet)
    (
        3,
        'DrjZ88F3Ahm93CY2TFkkyUe8Ko7YJnvmv2Tq6zPuWvTc',
        8,
        '2024-03-05 15:20:00',
        '2024-03-06 16:00:00'
    ),
    (
        5,
        'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg',
        8,
        '2024-03-06 16:00:00',
        NULL
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
INSERT INTO notification (user_id, title, message, is_read, created_on)
VALUES (
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
    ),
    (
        9,
        'Product Shipped',
        'Your Nike Zoom Pegasus has been shipped and is on the way.',
        TRUE,
        '2024-01-21 10:00:00'
    ),
    (
        10,
        'New Product Available',
        'Nike Dunk Low is now available for purchase at sports_retailer.',
        FALSE,
        '2024-03-02 09:30:00'
    ),
    (
        6,
        'Suspicious Activity',
        'Product ADIDAS-STAN-004 has been flagged as suspicious. Please review.',
        FALSE,
        '2024-03-05 15:30:00'
    ),
    (
        2,
        'Product Registration',
        'Your product NIKE-AIR-001 has been successfully registered on the blockchain.',
        TRUE,
        '2024-01-15 10:35:00'
    ),
    (
        3,
        'Product Registration',
        'Your product ADIDAS-ULTRA-001 has been successfully registered on the blockchain.',
        TRUE,
        '2024-01-25 11:05:00'
    );
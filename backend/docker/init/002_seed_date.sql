SET search_path TO fyp_25_s4_20;

-- ===========================
-- Insert Users (with generated Solana keypairs)
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
        '[154,128,198,72,60,101,91,221,97,224,235,94,92,156,198,147,184,19,253,59,247,119,101,44,112,150,87,166,13,250,217,252,229,243,42,210,130,85,122,196,41,189,130,12,71,41,206,189,115,6,121,13,126,62,161,208,208,246,70,210,104,136,167,139]',
        'H3opUoJVesQpvYIMRynOvXMGeQ1+PqHQ0PZG0miIp4s'
    ),
    (
        'nike_manufacturer',
        'nike123',
        'nike@manufacturer.com',
        'manufacturer',
        '[44,67,182,18,154,133,223,194,41,75,186,48,179,211,240,181,99,48,177,148,59,71,60,198,61,151,91,199,205,11,236,87,63,142,117,188,145,65,204,141,249,58,149,140,37,34,50,83,34,198,191,136,163,255,23,13,169,115,128,102,172,116,89,196]',
        '38516vSRQcyN+TqVjCUiMlMixr+Io/8XDalzgGasdFnE'
    ),
    (
        'adidas_manufacturer',
        'adidas123',
        'adidas@manufacturer.com',
        'manufacturer',
        '[240,9,135,227,194,51,149,145,131,23,207,90,140,6,79,64,81,142,49,76,90,67,52,91,222,115,71,166,63,178,142,6,226,176,128,109,234,164,5,141,46,230,186,83,69,145,244,122,196,147,59,214,115,55,224,186,30,151,206,209,135,163,98,209]',
        'CKcAbTOkBY0u5rpTRZH0esSTLNZzJuC6HpfO0YejYtE'
    ),
    (
        'global_distributor',
        'global123',
        'global@distributor.com',
        'distributor',
        '[238,10,119,164,23,225,220,90,26,189,21,97,206,156,168,216,47,223,217,233,189,145,177,168,198,221,95,152,124,235,101,114,52,150,105,31,63,130,219,152,55,243,124,87,96,46,12,93,21,24,143,72,62,218,188,233,17,143,154,57,180,111,127,139]',
        '4JZpHz+C25g383xXYC4MXRUYj0g+2rzpEY+aObRvf4s'
    ),
    (
        'asia_distributor',
        'asia123',
        'asia@distributor.com',
        'distributor',
        '[178,180,236,34,221,149,84,22,102,227,37,155,100,60,153,112,45,23,9,5,138,72,48,76,158,246,168,114,199,170,120,47,51,241,133,105,16,20,121,112,242,210,72,52,193,247,93,58,99,216,59,199,197,5,69,234,88,229,186,110,64,104,126,35]',
        '4/GFaRAUeXDy0kg0wfddOmPYO8fFBUXqWOW6bkBofyM'
    ),
    (
        'sports_retailer',
        'sports123',
        'sports@retailer.com',
        'retailer',
        '[182,50,119,45,254,123,24,171,176,70,36,229,80,241,41,159,138,121,153,205,201,171,84,106,84,184,245,86,111,110,217,195,80,198,44,80,162,144,150,103,40,92,225,208,220,228,16,188,171,20,159,109,236,117,41,223,11,15,166,57,254,150,175,94]',
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14'
    ),
    (
        'fashion_retailer',
        'fashion123',
        'fashion@retailer.com',
        'retailer',
        '[141,98,5,185,95,61,246,19,241,34,74,96,100,37,238,42,14,184,184,4,222,155,82,28,30,201,122,23,203,168,25,227,36,153,192,172,187,195,140,162,81,62,45,113,112,185,14,164,105,148,180,128,102,68,110,102,47,4,242,81,183,153,177,79]',
        '4JnArLvDjKJRPi1xcLkOpGmUtIBmRG5mLwTyUbeZsU8'
    ),
    (
        'john_consumer',
        'john123',
        'john@consumer.com',
        'consumer',
        '[109,22,89,188,214,59,117,230,226,107,230,247,10,69,253,238,100,211,198,194,139,253,220,216,128,112,123,33,74,252,31,17,41,127,66,6,15,104,237,15,13,171,202,12,35,28,17,31,133,110,144,85,254,238,227,174,159,110,207,184,219,80,95,153]',
        '4n9CBg9o7Q8Nq8oMIxwRH4VukFX+7uOun27PuNtQX5k'
    ),
    (
        'sarah_consumer',
        'sarah123',
        'sarah@consumer.com',
        'consumer',
        '[198,182,17,114,47,80,73,238,44,123,107,219,128,52,165,205,231,80,105,20,123,141,50,145,176,171,76,131,134,106,120,52,121,119,116,140,85,11,186,15,107,77,160,225,165,225,166,13,101,131,41,129,155,248,111,246,105,116,112,232,91,193,202,179]',
        'CXd0jFULug9rTaDhpeGmDWWDKYGb+G/2aXRw6FvByrM'
    ),
    (
        'mike_consumer',
        'mike123',
        'mike@consumer.com',
        'consumer',
        '[110,161,136,26,179,212,163,239,218,99,43,48,252,109,155,27,222,154,5,202,81,176,12,14,247,128,61,159,212,211,125,226,166,142,127,20,119,14,206,183,190,115,153,137,97,51,99,169,219,49,211,23,125,163,238,73,196,62,180,203,76,101,203,6]',
        'CY5/FHcOzre+c5mJYTNjqdsx0xd9o+5JxD60y0xlyws'
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
        E'\\x89504e470d0a1a0a',
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
        E'\\x89504e470d0a1a0b',
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
        E'\\x89504e470d0a1a0c',
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
        E'\\x89504e470d0a1a0d',
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
        E'\\x89504e470d0a1a0e',
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
        E'\\x89504e470d0a1a0f',
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
        E'\\x89504e470d0a1a10',
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
        E'\\x89504e470d0a1a11',
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
        '38516vSRQcyN+TqVjCUiMlMixr+Io/8XDalzgGasdFnE',
        4,
        '4JZpHz+C25g383xXYC4MXRUYj0g+2rzpEY+aObRvf4s',
        1,
        'create',
        'confirmed',
        1000001,
        '2024-01-15 10:30:00'
    ),
    (
        '0x2b3c4d5e6f7g8h9i0j1k',
        4,
        '4JZpHz+C25g383xXYC4MXRUYj0g+2rzpEY+aObRvf4s',
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        1,
        'transfer',
        'confirmed',
        1000102,
        '2024-01-16 08:00:00'
    ),
    (
        '0x3c4d5e6f7g8h9i0j1k2l',
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        8,
        '4n9CBg9o7Q8Nq8oMIxwRH4VukFX+7uOun27PuNtQX5k',
        1,
        'transfer',
        'confirmed',
        1000253,
        '2024-01-18 14:00:00'
    ),
    (
        '0x4d5e6f7g8h9i0j1k2l3m',
        8,
        '4n9CBg9o7Q8Nq8oMIxwRH4VukFX+7uOun27PuNtQX5k',
        8,
        '4n9CBg9o7Q8Nq8oMIxwRH4VukFX+7uOun27PuNtQX5k',
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
        '38516vSRQcyN+TqVjCUiMlMixr+Io/8XDalzgGasdFnE',
        5,
        '4/GFaRAUeXDy0kg0wfddOmPYO8fFBUXqWOW6bkBofyM',
        2,
        'create',
        'confirmed',
        1000550,
        '2024-01-20 14:20:00'
    ),
    (
        '0x6f7g8h9i0j1k2l3m4n5o',
        5,
        '4/GFaRAUeXDy0kg0wfddOmPYO8fFBUXqWOW6bkBofyM',
        9,
        'CXd0jFULug9rTaDhpeGmDWWDKYGb+G/2aXRw6FvByrM',
        2,
        'transfer',
        'confirmed',
        1000631,
        '2024-01-21 09:30:00'
    ),
    (
        '0x7g8h9i0j1k2l3m4n5o6p',
        9,
        'CXd0jFULug9rTaDhpeGmDWWDKYGb+G/2aXRw6FvByrM',
        9,
        'CXd0jFULug9rTaDhpeGmDWWDKYGb+G/2aXRw6FvByrM',
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
        '38516vSRQcyN+TqVjCUiMlMixr+Io/8XDalzgGasdFnE',
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        3,
        'create',
        'confirmed',
        1001120,
        '2024-02-05 09:15:00'
    ),
    (
        '0x9i0j1k2l3m4n5o6p7q8r',
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
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
        'CKcAbTOkBY0u5rpTRZH0esSTLNZzJuC6HpfO0YejYtE',
        4,
        '4JZpHz+C25g383xXYC4MXRUYj0g+2rzpEY+aObRvf4s',
        4,
        'create',
        'confirmed',
        1000900,
        '2024-01-25 11:00:00'
    ),
    (
        '0xb1c2d3e4f5g6h7i8j9k0',
        4,
        '4JZpHz+C25g383xXYC4MXRUYj0g+2rzpEY+aObRvf4s',
        8,
        '4n9CBg9o7Q8Nq8oMIxwRH4VukFX+7uOun27PuNtQX5k',
        4,
        'transfer',
        'confirmed',
        1000991,
        '2024-01-26 11:45:00'
    ),
    (
        '0xc2d3e4f5g6h7i8j9k0l1',
        8,
        '4n9CBg9o7Q8Nq8oMIxwRH4VukFX+7uOun27PuNtQX5k',
        8,
        '4n9CBg9o7Q8Nq8oMIxwRH4VukFX+7uOun27PuNtQX5k',
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
        '38516vSRQcyN+TqVjCUiMlMixr+Io/8XDalzgGasdFnE',
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        7,
        'create',
        'confirmed',
        1001850,
        '2024-03-01 10:00:00'
    ),
    (
        '0xe4f5g6h7i8j9k0l1m2n3',
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        10,
        'CY5/FHcOzre+c5mJYTNjqdsx0xd9o+5JxD60y0xlyws',
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
        '38516vSRQcyN+TqVjCUiMlMixr+Io/8XDalzgGasdFnE',
        1,
        '2024-01-15 10:30:00',
        '2024-01-16 08:00:00'
    ),
    (
        4,
        '4JZpHz+C25g383xXYC4MXRUYj0g+2rzpEY+aObRvf4s',
        1,
        '2024-01-16 08:00:00',
        '2024-01-18 14:00:00'
    ),
    (
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        1,
        '2024-01-18 14:00:00',
        '2024-01-22 10:00:00'
    ),
    (
        8,
        '4n9CBg9o7Q8Nq8oMIxwRH4VukFX+7uOun27PuNtQX5k',
        1,
        '2024-01-22 10:00:00',
        NULL
    ),
    -- Product 2: Nike Zoom Pegasus ownership chain
    (
        2,
        '38516vSRQcyN+TqVjCUiMlMixr+Io/8XDalzgGasdFnE',
        2,
        '2024-01-20 14:20:00',
        '2024-01-21 09:30:00'
    ),
    (
        5,
        '4/GFaRAUeXDy0kg0wfddOmPYO8fFBUXqWOW6bkBofyM',
        2,
        '2024-01-21 09:30:00',
        '2024-01-25 11:00:00'
    ),
    (
        9,
        'CXd0jFULug9rTaDhpeGmDWWDKYGb+G/2aXRw6FvByrM',
        2,
        '2024-01-25 11:00:00',
        NULL
    ),
    -- Product 3: Nike React Infinity ownership chain (still with retailer)
    (
        2,
        '38516vSRQcyN+TqVjCUiMlMixr+Io/8XDalzgGasdFnE',
        3,
        '2024-02-05 09:15:00',
        '2024-02-06 10:15:00'
    ),
    (
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        3,
        '2024-02-06 10:15:00',
        NULL
    ),
    -- Product 4: Adidas Ultraboost ownership chain
    (
        3,
        'CKcAbTOkBY0u5rpTRZH0esSTLNZzJuC6HpfO0YejYtE',
        4,
        '2024-01-25 11:00:00',
        '2024-01-26 11:45:00'
    ),
    (
        4,
        '4JZpHz+C25g383xXYC4MXRUYj0g+2rzpEY+aObRvf4s',
        4,
        '2024-01-26 11:45:00',
        '2024-01-30 13:00:00'
    ),
    (
        8,
        '4n9CBg9o7Q8Nq8oMIxwRH4VukFX+7uOun27PuNtQX5k',
        4,
        '2024-01-30 13:00:00',
        NULL
    ),
    -- Product 5: Adidas NMD R1 ownership chain (reserved, no blockchain yet)
    (
        3,
        'CKcAbTOkBY0u5rpTRZH0esSTLNZzJuC6HpfO0YejYtE',
        5,
        '2024-02-10 16:45:00',
        '2024-02-11 14:00:00'
    ),
    (
        5,
        '4/GFaRAUeXDy0kg0wfddOmPYO8fFBUXqWOW6bkBofyM',
        5,
        '2024-02-11 14:00:00',
        NULL
    ),
    -- Product 6: Adidas Superstar ownership chain (available at retailer, no blockchain yet)
    (
        3,
        'CKcAbTOkBY0u5rpTRZH0esSTLNZzJuC6HpfO0YejYtE',
        6,
        '2024-02-15 13:30:00',
        '2024-02-16 12:30:00'
    ),
    (
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        6,
        '2024-02-16 12:30:00',
        NULL
    ),
    -- Product 7: Nike Dunk Low ownership chain
    (
        2,
        '38516vSRQcyN+TqVjCUiMlMixr+Io/8XDalzgGasdFnE',
        7,
        '2024-03-01 10:00:00',
        '2024-03-02 09:00:00'
    ),
    (
        6,
        '2MYsUKKQlmcoPuHQ3OQQvKsUn23sdSnfCw+mOfqWr14',
        7,
        '2024-03-02 09:00:00',
        '2024-03-04 15:00:00'
    ),
    (
        10,
        'CY5/FHcOzre+c5mJYTNjqdsx0xd9o+5JxD60y0xlyws',
        7,
        '2024-03-04 15:00:00',
        NULL
    ),
    -- Product 8: Adidas Stan Smith ownership chain (suspicious product, no blockchain yet)
    (
        3,
        'CKcAbTOkBY0u5rpTRZH0esSTLNZzJuC6HpfO0YejYtE',
        8,
        '2024-03-05 15:20:00',
        '2024-03-06 16:00:00'
    ),
    (
        5,
        '4/GFaRAUeXDy0kg0wfddOmPYO8fFBUXqWOW6bkBofyM',
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
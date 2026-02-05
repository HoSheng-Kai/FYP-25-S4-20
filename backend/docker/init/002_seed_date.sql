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
  public_key,
  verified,
  banned
)
VALUES
  ('admin_user','vault:v1:x1Nj0+gKIBBVWLBlAmTeoC6D0k2+nO0FwS7/W6Z6GBagi0P0','vault:v1:iRP6pXBKVUr/NGkaLYWWP3dZDjjw2EhxNiaiUeD2uGFv11XSf3eLoaCqAVBZzK4Z1w==','admin',
   'pR9HgGJrxkFTVebFhYAoq4URkLti4tph9f7Sxvgrpzc', TRUE, FALSE),

-- unverify test case
  ('nike_manufacturer','vault:v1:TIgpR0mBmqs1oimsvWt3tU/fhTOqiwbdEf1yQb23Zkl3qP8=','vault:v1:Uq6Q/6KiyaoQPD2j640sqMkxn34nf3LYjUm6sKotlM+pxhXuV0rfJ3O9M+8tL4KJdA==','manufacturer',
   '4Vu8gxiWGHQYF7jfj3qiFUQmPQpyZNwvpmiLBXJ7gA4b', FALSE, FALSE),

  ('phantom_wallet_1','vault:v1:b/vksgJDZzUSaYdXRhll0mz6ibKgHQIZTZudmoU8dNTH99nUzyv/bM8H8Vc=','vault:v1:2ci0HxQoSI5/okUbC0ZYkClJXDeTJiC283MXgJ4nbqwtiqCEPNOtXtkNx7zeg5GOzw==','manufacturer',
    '4Vu8gxiWGHQYF7jfj3qiFUQmPQpyZNwvpmiLBXJ7gA4b', TRUE, FALSE),

--   ('nike_manufacturer','vault:v1:3jjPuS7x7E9sqWpsl19PknOAgdyulaljhyOeqvvImLf1e/U=','vault:v1:sbz51RV4wggTULysMMeN/GGr9UN452bNHZIx8KZFl/EFMYvrhb/rNd6z3pHLfiZVRg==','manufacturer',
--    '3A3nx4qQQCy4GwKgexB9weV3X9ZSZ48N9kVEquAEzNyb1iMfjHYc3s2ERYhdfTHvdenvAfpZd7eB5kpHpcdc3F3B',
--    '4A2jFXqqfJj5VqhjXGCgdNZmNgP5KjrJXHkGdLVao6so', FALSE, FALSE),

  ('adidas_manufacturer','vault:v1:wbmMPgHjoGOV6vCiTWjAjCU8q/V4mWKC8FbbWYfa6sAdex/86g==','vault:v1:nY9gNsBIE7rxzXUXm6Rrq8JeGOKoB1+a1J2V+8jHXedYwAWeeAUKP+cHM00eEtKqQw==','manufacturer',
   'DrjZ88F3Ahm93CY2TFkkyUe8Ko7YJnvmv2Tq6zPuWvTc', TRUE, FALSE),

  ('global_distributor','vault:v1:T5+Ow5uElo6GZmxoA/heWxMLqRGLJgZhE/9XU8dTxhrLZkS7Cg==','vault:v1:SYrKV+zAedFvjkn1bgleiHbEDWgNAnv2dJqGHIdTQTC1wDNlEBfytKY2NSTQdeZK5g==','distributor',
   'DuT5cjvzF2wm98bniue6grQnAuk2Sw4TkKks3bV2Ddmh', TRUE, FALSE),

  ('asia_distributor','vault:v1:V1aTvr/4O9JoEC6KMiuRL2YEx0RV6SajUlAV4ph2dSPmAHQ=','vault:v1:vouKIklYqnmcDqvQkPNAnwY4x8lxcJE02I+69Kb3MCyhLZiPLxXfgXSjhrLLhBwohw==','distributor',
   'HnktLTSaY1PLT6q7KTTCSWsVJGtfFMLk6ejj1X4tnxdg', TRUE, FALSE),

  ('sports_retailer','vault:v1:n0EGdVC58KlCfSa3CWW5GxFE5AddrzuRY/g7K5vIdi9x7zzm6A==','vault:v1:6V9GsDf6ZMyTqhkZOtbjZJdd7/1vVjZ6VgciU/8s80RwKrFJDhdLZbzUgHTFuAJQrQ==','retailer',
   '8pzmM4ZsaTvesxFetuZPUYsKFb7LFkcztue2pNis5aCJ', TRUE, FALSE),

-- banned test case
  ('fashion_retailer','vault:v1:5gvWlw0Xnlzu5PEpn5NN2KL9EfcEN0YYldwIjpXLnMqxrHfq+1Q=','vault:v1:ch9JFgr1VR36mXrWoXtsEK4HNW/GH47q2CftqNFroMCpGgCr8aO6OcN8beaqz7fyew==','retailer',
   '3NdBsPtC3cXjo16jsTuJxbBXhRFWFiWT9kz9wWXHokYd', TRUE, TRUE),

  ('john_consumer','vault:v1:gPZ+iDQNhr006L6lgoSZmUKlYDgeSF9XcuSfwVzKF8tjCNY=','vault:v1:8IwAM3juQ8iLoXd3z1+NiqCZ7Qy6kMXEJA7ZjvGzG4cHPDNzuFyHljQcGyl8R5FmoQ==','consumer',
   'BJmn7rMxJiasbGCEHJqYxDiYj16BTvzzQkKqGZ6HECU6', TRUE, FALSE),

  ('sarah_consumer','vault:v1:98r35aOxAShRW1SCjrpIyX0ag2Kv5Qi9hLqym8OULmJ34L+h','vault:v1:6TDXr4B/yPF0iCO91dn0Qg2kVUwngMBCo1ToJ1mL21fcRCemR5nD+ubcS64fVwFn/g==','consumer',
   'G5XcPa1rbhheULPjCvwTGEhkA12fUu8dP4mNG2H9yg9U', TRUE, FALSE),

  ('mike_consumer','vault:v1:hzq57ZgBkblWCx9b3S4VaX2HaJ91vr2Xq1mCwHFQzdA7HbE=','vault:v1:UU+/lsPq6DcgpNE18/RJTunhiRfu2CmJ6G7U4vmarsKUKD/Iqyb2XBPpQnsxr2upqA==','consumer',
   '8Jtmqnz6K2qgNLHhBCjxmrtPceBnRQa1uHNFFNa8Nbid', TRUE, FALSE),

-- team admins
  ('darrick_admin','vault:v1:D9Fl5oTjCn7Bo0B07QL2QWIDGvOCygfgBYvadeUq/rtMk5oO','vault:v1:tVtcGnJ4lGqAZJD51fdZQUHxCgX5/aEJbI1VjJRbrEozEDvRxD6EPxGBNyuEBPfLNBM=','admin',
   NULL, TRUE, FALSE),

  ('chaing_admin','vault:v1:luITjxwaWJmIWAZ4wqIQQhpM1/Vye5xIsjbVT/qAD00h0uz6','vault:v1:+TEepokRgl8aJQiM7nXe1uBnfGrPz312khfxJ8PBdwf0sa1p1k79AL/zsXa779LWgPo=','admin',
   NULL, TRUE, FALSE),

  ('jiya_admin','vault:v1:RF2SyRTI9LaIAcvTHP88yFwsh9liXffMm65Oo7XkZewtTsVu','vault:v1:9D/wPb/rthqrh732cKmpUr1gM7LMUxCzb3SQa8QkK1PSEirm8KzrNEPmJkoCOANqmr0=','admin',
   NULL, TRUE, FALSE),

  ('juankiat_admin','vault:v1:QaJXL3wn41/SzcTHgA0+LeitiwWEFpsysj7EzcC8WPaXM1K4','vault:v1:0Cvi/Rv369qP0cCbg765uMXL0BJLayDRJk40b95l1KlFT384iP6tTeZhmGcXh7vbng==','admin',
   NULL, TRUE, FALSE),

  ('sk_admin','vault:v1:5Eq7OuBfTPKtHJ3qidvl53BPHReKUQImrMq+4xDfXXZYeDqb','vault:v1:8OVTFnfAWXyfacSSIvq/shz8dlHYtHE00p4O79p+Rc5nhqD/FOlIrx1fr2TYjCCljvL1','admin',
   NULL, TRUE, FALSE),

-- jiya test accounts (one per role)
  ('jiya_manufacturer','vault:v1:GGiSkB5f9rzR7FwKtpjBJnXLQbNYaVjqOAam/fVYcXJcjrRR','vault:v1:3BH8/9jct667W548EU59Q7gfQJz00X721zuz4wL7l3lYDfvmfOeVj8j9dw+xkumZBII=','manufacturer',
   '6wbxyuYSP3oYXVwu5A47HMpngWW5QYKwSBKVuaLvbh7W', TRUE, FALSE),

  ('jiya_distributor','vault:v1:eeDiKU9u5v8kctgnFpPDVBkQWnAYI9lmZbrGx7IYm4iuGKT8','vault:v1:NOLLxnvY01KW6dCWP8KjsNgvP0S2mAB1HyMdEp5f9baWC11Dbrn733wfI4Nn3MfuBZA=','distributor',
   'EnrG2U6BFamr9fC6KuV3tmJHy7nPXvHo8BcUXBrFQ7RN', TRUE, FALSE),

  ('jiya_retailer','vault:v1:zGmQeD/UZs4IhjGiBGVsJeETcQrIGKQBYj5wVN5dofGIn6ig','vault:v1:tIrw6Q/O2/KVbgEtUA0OrJnihy973rRxiW29ugNKb5FtJwZBcGSrZd7a4CTWFXV8iTg=','retailer',
   'AYW8eQ9xNwKZSnNZmupSnrLuYmBqSahPeoUj8viGJmkh', TRUE, FALSE),

  ('jiya_consumer','vault:v1:qIH/IA7gUCuqTI0csVtjVFyjMt8ztRojZ0iDzWvlVckgA76K','vault:v1:NGOQyyiPtJwsHFHiMpXPXmnJDaWSX6ladMkj1mcF5WtdpXjCwMIby5AhmDlstMi0eNk=','consumer',
   'GKYR1iVV9prf7XmuC149TdtLKpgzDPbFmjLbqyWE5ZTb', TRUE, FALSE);

-- ===========================
-- Insert Products
-- ===========================
-- Product IDs will be 1-8
INSERT INTO product (
        registered_by,
        serial_no,
        qr_code,
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
   FALSE, '2024-03-05 15:30:00', 8, NULL),

  (16, 'Welcome Admin',
   'Welcome to the platform, sk_admin! You have been granted administrator privileges.',
   TRUE, '2024-03-12 08:00:00', NULL, NULL),

  (16, 'System Update',
   'A new system update has been deployed. Please review the changelog for details.',
   FALSE, '2024-03-12 09:30:00', NULL, NULL)

ON CONFLICT ON CONSTRAINT notification_user_product_tx_uniq
DO NOTHING;


-- COMMIT;
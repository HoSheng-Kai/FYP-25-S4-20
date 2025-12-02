#!/bin/bash
set -e

# This runs during PostgreSQL initialization
# Configure pg_hba.conf to allow password authentication from all hosts

cat >> "$PGDATA/pg_hba.conf" <<EOF

# Custom authentication rules
host    all             all             0.0.0.0/0               scram-sha-256
host    all             all             ::/0                    scram-sha-256
EOF

echo "Custom pg_hba.conf configured"
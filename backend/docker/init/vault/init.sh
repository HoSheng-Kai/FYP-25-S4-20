#!/bin/sh

export VAULT_ADDR='http://127.0.0.1:8200'

echo "=== Waiting for Vault to start ==="
until vault status 2>&1 | grep -q "Sealed"; do
  echo "Waiting for Vault..."
  sleep 2
done

if [ ! -f /vault/file/init-keys.txt ]; then
  echo "=== Initializing Vault for first time ==="
  vault operator init -key-shares=1 -key-threshold=1 > /vault/file/init-keys.txt
  echo "=== Keys saved to /vault/file/init-keys.txt ==="
fi

UNSEAL_KEY=$(grep 'Unseal Key 1:' /vault/file/init-keys.txt | awk '{print $NF}')
ROOT_TOKEN=$(grep 'Initial Root Token:' /vault/file/init-keys.txt | awk '{print $NF}')

if vault status | grep -q "Sealed.*true"; then
  echo "=== Unsealing Vault ==="
  vault operator unseal "$UNSEAL_KEY"
else
  echo "=== Vault already unsealed ==="
fi

export VAULT_TOKEN="$ROOT_TOKEN"

if ! vault secrets list | grep -q "^transit/"; then
  echo "=== Enabling transit engine ==="
  vault secrets enable transit
fi

if ! vault read transit/keys/my-app-key >/dev/null 2>&1; then
  echo "=== Creating encryption key ==="
  vault write -f transit/keys/my-app-key
else
  echo "=== Key 'my-app-key' already exists ==="
fi

echo "================================"
echo "Vault is READY"
echo "Root Token: $ROOT_TOKEN"
echo "================================"

tail -f /dev/null

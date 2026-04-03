#!/bin/bash
# Set Vercel environment variables for production deployment without storing secrets in the repo.

set -euo pipefail

required_vars=(
  DB_HOST
  DB_PORT
  DB_NAME
  DB_USER
  DB_PASSWORD
  OPENROUTER_API_KEY
  NEXTAUTH_SECRET
  NEXTAUTH_URL
)

for name in "${required_vars[@]}"; do
  if [ -z "${!name:-}" ]; then
    echo "Missing required environment variable: $name"
    exit 1
  fi
done

echo "Syncing production environment variables to Vercel..."

for name in "${required_vars[@]}"; do
  if printf '%s' "${!name}" | vercel env add "$name" production >/dev/null 2>&1; then
    echo "Added $name"
  else
    printf '%s' "${!name}" | vercel env update "$name" production >/dev/null
    echo "Updated $name"
  fi
done

echo "Vercel environment variables are in sync."
echo "Redeploy with: vercel --prod"

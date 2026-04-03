#!/bin/bash
# Setup PostgreSQL for Woodbury Diet App without hardcoding credentials.

set -euo pipefail

DB_USER="${DB_USER:-woodbury}"
DB_NAME="${DB_NAME:-woodbury_diet}"
ALLOWED_CIDR="${ALLOWED_CIDR:-}"

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "Set DB_PASSWORD before running this script."
  exit 1
fi

if [ -z "$ALLOWED_CIDR" ]; then
  echo "Set ALLOWED_CIDR to the trusted network range that should reach PostgreSQL."
  exit 1
fi

sudo -u postgres psql <<EOF
DO
\$\$
BEGIN
	IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
		CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
	ELSE
		ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
	END IF;
END
\$\$;
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

sudo -u postgres psql -d "$DB_NAME" <<EOF
GRANT ALL ON SCHEMA public TO ${DB_USER};
EOF

sudo sed -i "s/^#\?listen_addresses\s*=.*/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

echo "host    all             all             ${ALLOWED_CIDR}               md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf >/dev/null

sudo systemctl restart postgresql

echo "PostgreSQL setup complete."
echo "Use DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD as environment variables in your app."

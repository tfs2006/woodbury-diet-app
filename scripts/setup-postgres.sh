#!/bin/bash
# Setup PostgreSQL for Woodbury Diet App

# Create user and database
sudo -u postgres psql <<EOF
CREATE USER woodbury WITH PASSWORD 'WoodburyDiet2026!';
CREATE DATABASE woodbury_diet OWNER woodbury;
GRANT ALL PRIVILEGES ON DATABASE woodbury_diet TO woodbury;
\c woodbury_diet
GRANT ALL ON SCHEMA public TO woodbury;
EOF

# Configure PostgreSQL to listen on all interfaces
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/*/main/postgresql.conf

# Allow remote connections with password auth
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

# Open firewall port
sudo ufw allow 5432/tcp 2>/dev/null || sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT

echo "PostgreSQL setup complete!"
echo "Connection string: postgresql://woodbury:WoodburyDiet2026!@$(curl -s ifconfig.me):5432/woodbury_diet"

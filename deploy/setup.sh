#!/bin/bash
# Run this ON the EC2 instance (Amazon Linux 2023) after cloning/copying the
# project to ~/pickleball-open-play. One-time setup: installs Node, builds
# the app, and registers it as a systemd service that starts on boot.
set -euo pipefail

APP_DIR="$HOME/pickleball-open-play"
cd "$APP_DIR"

# --- Node.js (via NodeSource, Amazon Linux 2023) ---
if ! command -v node >/dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
  sudo dnf install -y nodejs
fi

npm ci
npm run build

# --- Optional: let Node bind to port 80 without running as root ---
# Uncomment these two lines AND the `Environment=PORT=80` line in
# pickleball.service if you want players to skip typing ":4321" in the URL.
# sudo dnf install -y libcap
# sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(command -v node)")"

sudo cp deploy/pickleball.service /etc/systemd/system/pickleball.service
sudo systemctl daemon-reload
sudo systemctl enable --now pickleball

echo
echo "Done. Check status with: sudo systemctl status pickleball"
echo "Public URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):${PORT:-4321}"

#!/bin/bash
# Runs once on first boot. Installs Node and prepares the systemd service —
# it does NOT start the app, since the code isn't on the box yet. After
# copying the code up (see deploy/README.md), run:
#   sudo systemctl start pickleball
set -euo pipefail

APP_DIR="/home/ec2-user/${project_name}"
mkdir -p "$APP_DIR"
chown ec2-user:ec2-user "$APP_DIR"

curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

cat > /etc/systemd/system/pickleball.service <<'UNIT'
[Unit]
Description=${project_name}
After=network.target

[Service]
Type=simple
WorkingDirectory=${app_dir}
ExecStart=/usr/bin/npx tsx server/index.ts
Restart=on-failure
RestartSec=3
User=ec2-user
Environment=NODE_ENV=production
Environment=PORT=${app_port}

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable pickleball

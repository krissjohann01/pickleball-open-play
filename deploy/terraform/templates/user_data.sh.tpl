#!/bin/bash
# Runs once on first boot. Installs Node + Caddy, prepares the systemd
# service for the app — it does NOT start it, since the code isn't on the
# box yet. After copying the code up (see deploy/README.md), run:
#   sudo systemctl start pickleball
set -euo pipefail

APP_DIR="/home/ec2-user/${project_name}"
mkdir -p "$APP_DIR"
chown ec2-user:ec2-user "$APP_DIR"

# --- Node.js ---
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
Environment=ADMIN_PASSWORD=${admin_password}

[Install]
WantedBy=multi-user.target
UNIT

# --- Caddy (reverse proxy + automatic free HTTPS via Let's Encrypt) ---
# Amazon Linux 2023 isn't in Caddy's official package repos, so grab the
# static binary directly instead.
CADDY_VERSION="$(curl -fsSL https://api.github.com/repos/caddyserver/caddy/releases/latest | grep -o '"tag_name": "v[^"]*' | sed 's/.*v//')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) CADDY_ARCH=amd64 ;;
  aarch64) CADDY_ARCH=arm64 ;;
  *) echo "Unsupported arch for Caddy: $ARCH" >&2; exit 1 ;;
esac
curl -fsSL "https://github.com/caddyserver/caddy/releases/latest/download/caddy_$${CADDY_VERSION}_linux_$${CADDY_ARCH}.tar.gz" -o /tmp/caddy.tar.gz
tar -xzf /tmp/caddy.tar.gz -C /tmp caddy
mv /tmp/caddy /usr/local/bin/caddy
chmod +x /usr/local/bin/caddy
setcap cap_net_bind_service=+ep /usr/local/bin/caddy

mkdir -p /etc/caddy
cat > /etc/caddy/Caddyfile <<CADDYFILE
${duckdns_subdomain}.duckdns.org {
    reverse_proxy localhost:${app_port}
}
CADDYFILE

cat > /etc/systemd/system/caddy.service <<'UNIT'
[Unit]
Description=Caddy
After=network.target

[Service]
Type=notify
ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=512
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE
User=ec2-user
Group=ec2-user
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable caddy
systemctl start caddy
systemctl enable pickleball

# --- Keep DuckDNS pointed at this instance's current IP. Runs once now (at
# boot) and this same command should be re-run after every start; see
# deploy/README.md for the day-to-day stop/start routine. ---
cat > /usr/local/bin/duckdns-update.sh <<SCRIPT
#!/bin/bash
curl -fsS "https://www.duckdns.org/update?domains=${duckdns_subdomain}&token=${duckdns_token}&ip="
SCRIPT
chmod +x /usr/local/bin/duckdns-update.sh
/usr/local/bin/duckdns-update.sh || true

cat > /etc/systemd/system/duckdns-update.service <<'UNIT'
[Unit]
Description=Update DuckDNS with this instance's current public IP
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/duckdns-update.sh
UNIT

systemctl daemon-reload
systemctl enable duckdns-update

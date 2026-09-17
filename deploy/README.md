# Deploying to EC2

The app needs zero code changes to run on EC2 — it's already a self-contained
Node process that serves itself and persists to local disk. Infrastructure
(the instance, networking, key pair, Caddy, Node) is managed with
**Terraform** in `deploy/terraform/`; copying the app's code up is a separate,
simple step so day-2 updates work the same way as the first deploy.

Real, free HTTPS is part of the setup: [DuckDNS](https://www.duckdns.org)
gives a free subdomain, and [Caddy](https://caddyserver.com) automatically
gets and renews a Let's Encrypt certificate for it — no cost, no manual
renewal.

## One-time setup

1. **Get a free DuckDNS domain**: sign in at [duckdns.org](https://www.duckdns.org) (any existing Google/GitHub account works), add a subdomain (e.g. `yourclubname`), and copy the **token** shown at the top of the page.

2. **Install Terraform** (already done if you're reading this after asking Claude to set it up): `brew install hashicorp/tap/terraform`

3. **Configure AWS credentials** so Terraform can act on your account — any of the usual ways work, e.g. `aws configure` (needs the AWS CLI) or exporting `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. Terraform will not run without these; this is the one step that has to happen outside this repo.

4. **Set your DuckDNS details and an admin password**: copy `deploy/terraform/terraform.tfvars.example` to `deploy/terraform/terraform.tfvars` and fill in `duckdns_subdomain`, `duckdns_token`, and `admin_password` (this file is gitignored — none of these get committed). The admin password gates session-control actions; the roster page stays open to everyone regardless — see `ARCHITECTURE.md`.

5. **Provision the infrastructure**:
   ```
   cd deploy/terraform
   terraform init
   terraform plan    # review what it's about to create
   terraform apply
   ```
   This creates: an EC2 instance (default `t3.micro`), a security group (SSH locked to your current IP; only 80/443 open to everyone — the app itself is not directly reachable, only through Caddy), and a fresh SSH key pair (saved locally as `deploy/terraform/pickleball-open-play-key.pem` — gitignored, don't lose it). It does **not** create a static/Elastic IP — see the cost note below. On first boot the instance installs Node, installs and starts Caddy (which immediately requests a certificate for your DuckDNS domain), points DuckDNS at itself, and prepares (but doesn't start) the app's systemd service — there's no app code on it yet.

   When it finishes, note the outputs — `app_url` (your `https://` DuckDNS address), `ssh_command`, `public_ip`.

6. **Copy the app's code onto the instance and start it** (from the project root, not `deploy/terraform/`):
   ```
   rsync -avz -e "ssh -i deploy/terraform/pickleball-open-play-key.pem" \
     --exclude node_modules --exclude dist --exclude .data --exclude deploy --exclude '*.app' --exclude .git \
     ./ ec2-user@<PUBLIC_IP>:~/pickleball-open-play/
   ssh -i deploy/terraform/pickleball-open-play-key.pem ec2-user@<PUBLIC_IP> \
     'cd pickleball-open-play && npm ci && npm run build && sudo systemctl start pickleball'
   ```

7. Visit the `app_url` output (`https://<your-subdomain>.duckdns.org`) from any device — that's your live-synced app over real HTTPS, reachable from anywhere with internet.

## Day-to-day: stop it when not in use

- **Stop**: `aws ec2 stop-instances --instance-ids $(cd deploy/terraform && terraform output -raw instance_id)` (or the console). Compute billing stops immediately; the roster/session data on the instance's disk is untouched.
- **Start** before a session: `aws ec2 start-instances --instance-ids <id>`. The instance's public IP changes each time (see cost note below), but **you don't need to look it up** — a startup script re-points your DuckDNS domain at the new IP automatically on boot, so `https://<your-subdomain>.duckdns.org` just keeps working. Give it 15-30 seconds after the instance shows "running" for that update (and Caddy/the app) to be ready.
- **Tear down completely**: `terraform destroy` in `deploy/terraform/` — removes the instance, security group, and key pair. Nothing is left running or billing.

## Cost note: why no Elastic IP

Since Feb 2024, AWS charges ~$0.005/hour for *any* public IPv4 address attached to a running resource — Elastic or not. A "static" IP doesn't save money here; it just risks an extra idle charge if you forget to release it while stopped. Using the free auto-assigned public IP instead means: **$0 for IPv4 while stopped**, and the same tiny per-hour charge as anyone would pay while it's actually running. The DuckDNS auto-update script is what makes this painless — the URL stays the same even though the underlying IP doesn't.

## Updating the app after code changes

Same `rsync` + restart as the initial deploy, just `restart` instead of `start`:
```
rsync -avz -e "ssh -i deploy/terraform/pickleball-open-play-key.pem" \
  --exclude node_modules --exclude dist --exclude .data --exclude deploy --exclude '*.app' --exclude .git \
  ./ ec2-user@<PUBLIC_IP>:~/pickleball-open-play/
ssh -i deploy/terraform/pickleball-open-play-key.pem ec2-user@<PUBLIC_IP> \
  'cd pickleball-open-play && npm ci && npm run build && sudo systemctl restart pickleball'
```

## Debugging directly against the app (bypassing Caddy)

Set `expose_app_port_directly = true` in `terraform.tfvars` and re-apply (`terraform apply -target=aws_security_group.this`) to temporarily open `app_port` (4321) to the internet directly. Set it back to `false` and re-apply when done — there's no HTTPS on that path, only use it briefly for debugging.

## Prefer not to use Terraform?

`deploy/setup.sh` and `deploy/pickleball.service` do the Node/systemd part by hand over SSH (no Caddy/HTTPS setup included), if you'd rather click through the EC2 console yourself. `deploy/terraform/` is the recommended path since it's repeatable and `terraform destroy` cleanly removes everything when you're done.

## Worth knowing: what's gated and what isn't

The roster page has no login — anyone with the URL can view it and add themselves, on purpose, so the admin doesn't have to enter everyone by hand. Starting a session and every in-session control (advancing a court, pausing a player, food charges, ending the session, saving the summary) requires the shared `admin_password` — see `ARCHITECTURE.md` for exactly what's gated. Anyone without it can still watch a live session update in real time, just not touch the controls.

Changing the admin password on an already-running instance: edit `terraform.tfvars` and re-apply just the instance's environment — in practice, SSH in and edit `/etc/systemd/system/pickleball.service`'s `Environment=ADMIN_PASSWORD=` line directly, then `sudo systemctl daemon-reload && sudo systemctl restart pickleball` (a full `terraform apply` would replace the instance — see the Terraform section in `ARCHITECTURE.md`).

There is also basic abuse throttling built into the app itself (a per-IP connection cap, a per-connection action rate limit, a per-IP HTTP request limit, and a dedicated rate limit on admin login attempts specifically — see `ARCHITECTURE.md`), sized to comfortably handle a whole club session sharing one IP while still catching a genuine flood.

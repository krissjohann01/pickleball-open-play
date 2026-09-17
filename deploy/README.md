# Deploying to EC2

The app needs zero code changes to run on EC2 — it's already a self-contained
Node process that serves itself and persists to local disk. Infrastructure
(the instance, networking, key pair, Node install) is managed with
**Terraform** in `deploy/terraform/`; copying the app's code up is a separate,
simple step so day-2 updates work the same way as the first deploy.

## One-time setup

1. **Install Terraform** (already done if you're reading this after asking Claude to set it up): `brew install hashicorp/tap/terraform`

2. **Configure AWS credentials** so Terraform can act on your account — any of the usual ways work, e.g. `aws configure` (needs the AWS CLI) or exporting `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. Terraform will not run without these; this is the one step that has to happen outside this repo.

3. **Provision the infrastructure**:
   ```
   cd deploy/terraform
   terraform init
   terraform plan    # review what it's about to create
   terraform apply
   ```
   This creates: an EC2 instance (default `t3.micro`), a security group (SSH locked to your current IP, the app port open to everyone), and a fresh SSH key pair (saved locally as `deploy/terraform/pickleball-open-play-key.pem` — gitignored, don't lose it). It does **not** create a static/Elastic IP — see the cost note below. On first boot the instance installs Node and prepares (but doesn't start) the app's systemd service via a startup script — there's no code on it yet.

   When it finishes, note the outputs — `app_url`, `ssh_command`, `public_ip`.

4. **Copy the app's code onto the instance and start it** (from the project root, not `deploy/terraform/`):
   ```
   rsync -avz -e "ssh -i deploy/terraform/pickleball-open-play-key.pem" \
     --exclude node_modules --exclude dist --exclude .data --exclude deploy/terraform/.terraform \
     ./ ec2-user@<PUBLIC_IP>:~/pickleball-open-play/
   ssh -i deploy/terraform/pickleball-open-play-key.pem ec2-user@<PUBLIC_IP> \
     'cd pickleball-open-play && npm ci && npm run build && sudo systemctl start pickleball'
   ```

5. Visit the `app_url` output (`http://<PUBLIC_IP>:4321`) from any device — that's your live-synced app, reachable from anywhere with internet, not just your home Wi-Fi.

## Day-to-day: stop it when not in use

- **Stop**: `aws ec2 stop-instances --instance-ids $(cd deploy/terraform && terraform output -raw instance_id)` (or the console). Compute billing stops immediately; the roster/session data on the instance's disk is untouched.
- **Start** before a session: `aws ec2 start-instances --instance-ids <id>`. The public IP will be **different** each time (see cost note below) — after starting, run `terraform refresh && terraform output public_ip` in `deploy/terraform/`, or check the console. The systemd service starts automatically on boot, so the app is up within a few seconds of the instance being reachable.
- **Tear down completely**: `terraform destroy` in `deploy/terraform/` — removes the instance, security group, and key pair. Nothing is left running or billing.

## Cost note: why no Elastic IP

Since Feb 2024, AWS charges ~$0.005/hour for *any* public IPv4 address attached to a running resource — Elastic or not. A "static" IP doesn't save money here; it just risks an extra idle charge if you forget to release it while stopped. Using the free auto-assigned public IP instead means: **$0 for IPv4 while stopped**, and the same tiny per-hour charge as anyone would pay while it's actually running. The trade-off is looking up the new IP each time you start it (`terraform refresh`) — worth it for the savings on a casual-use tool.

## Updating the app after code changes

Same `rsync` + restart as the initial deploy, just `restart` instead of `start`:
```
rsync -avz -e "ssh -i deploy/terraform/pickleball-open-play-key.pem" \
  --exclude node_modules --exclude dist --exclude .data --exclude deploy/terraform/.terraform \
  ./ ec2-user@<PUBLIC_IP>:~/pickleball-open-play/
ssh -i deploy/terraform/pickleball-open-play-key.pem ec2-user@<PUBLIC_IP> \
  'cd pickleball-open-play && npm ci && npm run build && sudo systemctl restart pickleball'
```

## Prefer not to use Terraform?

`deploy/setup.sh` and `deploy/pickleball.service` do the same box-preparation steps by hand over SSH, if you'd rather click through the EC2 console yourself. `deploy/terraform/` is the recommended path since it's repeatable and `terraform destroy` cleanly removes everything when you're done.

## Worth knowing: no authentication

The app has no login/password — anyone with the URL can view and edit the roster/session. Fine for a casual tool shared only with your group, but if the IP gets out more broadly, anyone could mess with it. Options if that becomes a concern later: restrict the security group to specific IPs (edit `allowed_ssh_cidr`/the app port rule in `deploy/terraform/main.tf` — note the app port is intentionally open to everyone so players can reach it), or add a simple shared PIN gate to the app.

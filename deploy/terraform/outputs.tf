output "public_ip" {
  description = "Current public IP — changes each time the instance is stopped and started again. Re-run `terraform refresh` (or check the AWS console) after a restart to get the new one."
  value       = aws_instance.this.public_ip
}

output "app_url" {
  description = "The real URL to use — HTTPS via Caddy + your DuckDNS domain. Stable across stop/start as long as the DuckDNS-update step runs on each boot (see deploy/README.md)."
  value       = "https://${var.duckdns_subdomain}.duckdns.org"
}

output "ssh_command" {
  value = "ssh -i ${local_sensitive_file.private_key.filename} ec2-user@${aws_instance.this.public_ip}"
}

output "instance_id" {
  value = aws_instance.this.id
}

output "private_key_path" {
  value = local_sensitive_file.private_key.filename
}

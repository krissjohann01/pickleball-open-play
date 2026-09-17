variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "ap-southeast-1"
}

variable "instance_type" {
  description = "EC2 instance type. t3.micro is free-tier eligible for an account's first 12 months; t4g.micro (ARM) is cheaper afterward."
  type        = string
  default     = "t3.micro"
}

variable "app_port" {
  description = "Port the app listens on (and that's opened to the internet)."
  type        = number
  default     = 4321
}

variable "root_volume_gb" {
  description = "Root EBS volume size in GB."
  type        = number
  default     = 30
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH in. Defaults to your current public IP (auto-detected) — override if that's wrong or you're deploying from somewhere else than where you'll SSH from."
  type        = string
  default     = null
}

variable "project_name" {
  description = "Name prefix used for tags and resource names."
  type        = string
  default     = "pickleball-open-play"
}

variable "duckdns_subdomain" {
  description = "Your DuckDNS subdomain, without the .duckdns.org suffix (e.g. \"bereanpickleball\"). Caddy requests a free HTTPS certificate for <this>.duckdns.org."
  type        = string
  default     = "bereanpickleball"
}

variable "duckdns_token" {
  description = "DuckDNS API token (shown at the top of duckdns.org once logged in). Used by a startup script to keep the domain pointed at this instance's current IP, since we deliberately don't use a static Elastic IP."
  type        = string
  sensitive   = true
}

variable "admin_password" {
  description = "Shared password that gates session-control actions (starting a session, advancing courts, ending it, etc.). The roster page stays open to everyone regardless. Pick something real — this is the only thing standing between the public internet and your session controls."
  type        = string
  sensitive   = true
}

variable "expose_app_port_directly" {
  description = "Also open app_port to the internet directly, bypassing Caddy/HTTPS. Only useful for debugging — leave false normally."
  type        = bool
  default     = false
}

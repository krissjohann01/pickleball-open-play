variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
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
  default     = 8
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

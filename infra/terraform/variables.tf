variable "project" {
  description = "Project name used for tagging and naming"
  type        = string
  default     = "task-manager"
}

variable "environment" {
  description = "Environment name (dev|staging|prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "externalsecrets_irsa_role_arn" {
  description = "IAM Role ARN used by External Secrets Operator via IRSA"
  type        = string
  default     = ""
}

variable "backup_bucket_name" {
  description = "S3 bucket name for backups"
  type        = string
  default     = null
}

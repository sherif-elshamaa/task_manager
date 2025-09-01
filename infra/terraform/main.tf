locals {
  name_prefix = "${var.project}-${var.environment}"
  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Optional S3 bucket for backups
resource "aws_s3_bucket" "backups" {
  count  = var.backup_bucket_name == null ? 0 : 1
  bucket = var.backup_bucket_name
  tags   = local.tags
}

resource "aws_s3_bucket_versioning" "backups" {
  count  = var.backup_bucket_name == null ? 0 : 1
  bucket = aws_s3_bucket.backups[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

# Policy allowing read of secrets in AWS Secrets Manager for a specific path
# Attach this to your External Secrets IRSA role (externalsecrets_irsa_role_arn)
data "aws_iam_policy_document" "secrets_read" {
  statement {
    sid    = "AllowListSecrets"
    effect = "Allow"
    actions = [
      "secretsmanager:ListSecrets",
      "secretsmanager:DescribeSecret"
    ]
    resources = ["*"]
  }

  statement {
    sid    = "AllowGetSecretValues"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [
      # Limit to your project namespace/prefix if you use a naming convention, e.g. arn:aws:secretsmanager:region:acct:secret:task-manager-*
      "*"
    ]
  }
}

resource "aws_iam_policy" "externalsecrets_read" {
  name        = "${local.name_prefix}-externalsecrets-read"
  description = "Read access for External Secrets Operator"
  policy      = data.aws_iam_policy_document.secrets_read.json
}

# If you pass an existing IRSA role ARN, attach policy to it
resource "aws_iam_role_policy_attachment" "attach_to_irsa" {
  count      = length(var.externalsecrets_irsa_role_arn) > 0 ? 1 : 0
  role       = replace(var.externalsecrets_irsa_role_arn, ".*/", "") # role name from ARN
  policy_arn = aws_iam_policy.externalsecrets_read.arn
}

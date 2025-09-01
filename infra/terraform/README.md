# Terraform Baseline

This folder provides a minimal baseline to support:

- External Secrets Operator (ESO) reading from AWS Secrets Manager via IRSA
- Optional S3 bucket for backups

## Usage

1. Ensure you have Terraform >= 1.5 and AWS credentials configured.
2. Decide on your environment values:
   - `project` (default: task-manager)
   - `environment` (e.g., dev|staging|prod)
   - `aws_region` (default: us-east-1)
   - `externalsecrets_irsa_role_arn` (existing IRSA role used by ESO)
   - `backup_bucket_name` (optional; create an S3 bucket for backups)

```bash
terraform init
terraform plan -var "environment=dev" -var "externalsecrets_irsa_role_arn=arn:aws:iam::123456789012:role/eso-irsa"
terraform apply -auto-approve \
  -var "environment=dev" \
  -var "externalsecrets_irsa_role_arn=arn:aws:iam::123456789012:role/eso-irsa" \
  -var "backup_bucket_name=task-manager-dev-backups"
```

The IAM policy created allows ESO to list secrets and read secret values. You should restrict the resources list to only the secrets you need (using ARNs or a path-based naming convention).

output "backup_bucket_arn" {
  description = "ARN of the backups S3 bucket"
  value       = try(aws_s3_bucket.backups[0].arn, null)
}

output "externalsecrets_policy_arn" {
  description = "IAM policy ARN attached/for External Secrets read access"
  value       = aws_iam_policy.externalsecrets_read.arn
}

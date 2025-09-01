# Infrastructure Baseline

This baseline adds:

- Terraform for AWS IAM policy (External Secrets Operator) and optional S3 backups bucket.
- Kubernetes manifests for External Secrets (ClusterSecretStore + ExternalSecret) using AWS Secrets Manager.

## Structure

- `infra/terraform/`: Terraform configuration.
- `infra/k8s/externalsecrets/`: Kubernetes manifests for ESO.

## Prerequisites

- External Secrets Operator installed in the cluster with IRSA (or another auth method) and a ServiceAccount such as `external-secrets-sa` in namespace `external-secrets`.
- AWS Secrets created matching the keys used in `api-externalsecret.yaml`.

## Next Steps

- Update regions, namespaces, and secret keys to match your environment.
- Apply Terraform, attach the generated policy to the ESO IRSA role.
- Apply Kubernetes manifests:

```bash
kubectl apply -f infra/k8s/externalsecrets/clustersecretstore.yaml
kubectl apply -f infra/k8s/externalsecrets/api-externalsecret.yaml
```

- Mount `api-secrets` in your deployment and map to the app's env vars.

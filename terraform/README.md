# Terraform Infrastructure for Fraud Detection API

This directory contains Terraform configurations to deploy the Fraud Detection API infrastructure on Google Cloud Platform.

## Architecture

The infrastructure includes:

- **Google Cloud Run**: Serverless container hosting for the API
- **Cloud SQL (PostgreSQL)**: Database for application data
- **Redis (Memorystore)**: Caching layer for performance
- **VPC & Networking**: Private networking for secure communication
- **Secret Manager**: Secure storage for API keys and credentials
- **Artifact Registry**: Docker container registry
- **Cloud Monitoring**: Dashboards and alerting
- **IAM & Service Accounts**: Security and access control

## Prerequisites

1. **Google Cloud Project**: You need a GCP project with billing enabled
2. **gcloud CLI**: Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
3. **Terraform**: Install [Terraform](https://www.terraform.io/downloads) >= 1.0
4. **APIs Enabled**: The Terraform will enable required APIs automatically

## Setup Instructions

### 1. Initialize Backend Storage

First, create a GCS bucket for Terraform state:

```bash
cd scripts
./init-backend.sh YOUR_PROJECT_ID
cd ..
```

This script will:
- Create a GCS bucket for Terraform state
- Enable versioning and lifecycle rules
- Update the backend.tf file with your project ID

### 2. Configure Variables

Copy the example variables file and edit it:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
project_id = "your-gcp-project-id"
region     = "us-central1"
environment = "dev"

# API Keys (store these securely!)
google_api_key     = "your-google-api-key"
transunion_api_key = "your-transunion-api-key"

# Adjust other values as needed...
```

### 3. Initialize Terraform

If you're starting fresh:

```bash
terraform init
```

If you're migrating from local state to GCS:

```bash
terraform init -migrate-state
```

### 4. Plan and Apply

Review the changes Terraform will make:

```bash
terraform plan
```

Apply the infrastructure:

```bash
terraform apply
```

## State Management

The Terraform state is stored in a GCS bucket with:
- **Versioning**: Enabled for state history
- **Lifecycle Rules**: Old versions archived/deleted automatically
- **Access Control**: Restricted to authorized service accounts

The state bucket naming convention: `{PROJECT_ID}-fraud-detection-tf-state`

## Environment Management

This configuration supports multiple environments (dev, staging, prod) through the `environment` variable.

For different environments, you can:

1. Use different variable files:
```bash
terraform apply -var-file="dev.tfvars"
terraform apply -var-file="prod.tfvars"
```

2. Or use Terraform workspaces:
```bash
terraform workspace new staging
terraform workspace select staging
terraform apply
```

## Resources Created

### Core Infrastructure
- VPC Network and Subnets
- VPC Connector for Cloud Run
- Service Accounts with appropriate IAM roles

### Application Services
- Cloud Run service with auto-scaling
- Redis instance for caching
- Artifact Registry for Docker images

### Security & Operations
- Secret Manager secrets for API keys
- Cloud Monitoring dashboard
- Health checks and probes

## Outputs

After applying, Terraform will output:

- `service_url`: The URL of your deployed Cloud Run service
- `artifact_registry_url`: Docker registry URL for pushing images
- `terraform_state_bucket`: GCS bucket name for state storage

## Deployment Pipeline

1. **Build Docker Image**:
```bash
cd ../packages/api
docker build -t fraud-api .
```

2. **Tag and Push to Artifact Registry**:
```bash
# Get the registry URL from Terraform output
REGISTRY_URL=$(terraform output -raw artifact_registry_url)

# Tag the image
docker tag fraud-api:latest ${REGISTRY_URL}/fraud-api:latest

# Push to registry
docker push ${REGISTRY_URL}/fraud-api:latest
```

3. **Update Cloud Run Service**:
```bash
# Terraform will automatically deploy the latest image
terraform apply -target=google_cloud_run_v2_service.fraud_api
```

## Cost Optimization

To minimize costs in development:

1. Set `min_instances = 0` to scale to zero when idle
2. Use `redis_tier = "BASIC"` for development
3. Set smaller resource limits in variables
4. Enable `cpu_idle = true` for Cloud Run

## Monitoring

Access monitoring dashboards:

1. Go to [Cloud Console](https://console.cloud.google.com)
2. Navigate to Operations > Monitoring > Dashboards
3. Select "Fraud API Dashboard"

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure your account has necessary IAM roles:
   - `roles/owner` or specific roles like `roles/cloudrun.admin`

2. **APIs Not Enabled**: Terraform will enable APIs, but it may take a few minutes

3. **Bucket Already Exists**: If the state bucket exists, the init script will use it

4. **State Lock**: If Terraform state is locked:
```bash
terraform force-unlock <LOCK_ID>
```

## Clean Up

To destroy all resources:

```bash
terraform destroy
```

**Note**: The state bucket has `prevent_destroy = true` to avoid accidental deletion. To delete it:
1. Remove the lifecycle block from `state-bucket.tf`
2. Run `terraform apply`
3. Then run `terraform destroy`

## Security Considerations

1. **Never commit** `terraform.tfvars` or any file with actual API keys
2. Use Secret Manager for all sensitive data
3. Enable VPC Service Controls for additional security
4. Regular audit IAM permissions
5. Use separate projects for different environments

## Support

For issues or questions:
1. Check the [Terraform GCP Provider docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
2. Review Cloud Run [best practices](https://cloud.google.com/run/docs/best-practices)
3. Check application logs in Cloud Logging
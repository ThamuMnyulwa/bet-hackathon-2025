# Fraud Detection API Deployment

This document provides information about the deployment of the Fraud Detection API.

## Deployment Information

### Cloud Run Service

- **Service Name**: dev-fraud-detection-api
- **Region**: europe-west1
- **URL**: https://dev-fraud-detection-api-5a3ikt4cmq-ew.a.run.app
- **API Documentation**: https://dev-fraud-detection-api-5a3ikt4cmq-ew.a.run.app/docs
- **Health Endpoint**: https://dev-fraud-detection-api-5a3ikt4cmq-ew.a.run.app/api/v1/fraud/health

### Docker Image

- **Repository**: europe-west1-docker.pkg.dev/studied-zephyr-460821-n8/dev-fraud-api-repo/fraud-api
- **Tag**: latest

### Infrastructure

The infrastructure is managed using Terraform and includes:

- **VPC Connector**: dev-fraud-api-connector (for Redis access)
- **Redis Instance**: dev-fraud-api-cache
- **Secret Manager**:
  - dev-google-api-key
  - dev-transunion-api-key

## Deployment Process

### Local Development

1. **Build and run locally with Docker**:

```bash
# Build the Docker image
docker build -t fraud-api:latest .

# Run the container
docker run -p 8080:8080 -e GOOGLE_API_KEY=your_api_key_here fraud-api:latest
```

2. **Using Docker Compose**:

```bash
# Create a .env file with your Google API key
echo "GOOGLE_API_KEY=your_api_key_here" > .env

# Start the services
docker-compose up
```

### Cloud Deployment

1. **Using the deployment script**:

```bash
# Build the Docker image
./deploy.sh --build

# Push to Google Artifact Registry
./deploy.sh --push

# Deploy to Cloud Run
./deploy.sh --deploy

# Or do all of the above
./deploy.sh --all
```

2. **Manual deployment**:

```bash
# Build the Docker image for amd64/linux
docker build --platform linux/amd64 -t fraud-api:latest .

# Tag and push to Google Artifact Registry
PROJECT_ID="studied-zephyr-460821-n8"
REGION="europe-west1"
REPO="dev-fraud-api-repo"
IMAGE_NAME="fraud-api"
TAG="latest"

docker tag ${IMAGE_NAME}:${TAG} ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${TAG}
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${TAG}

# Deploy to Cloud Run
gcloud run deploy dev-fraud-detection-api \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${TAG} \
  --region=${REGION} \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="ENVIRONMENT=dev,GOOGLE_GENAI_USE_VERTEXAI=TRUE" \
  --update-secrets="GOOGLE_API_KEY=dev-google-api-key:latest,TRANSUNION_API_KEY=dev-transunion-api-key:latest" \
  --vpc-connector=dev-fraud-api-connector \
  --cpu=2 \
  --memory=2Gi \
  --min-instances=1 \
  --max-instances=10
```

## Troubleshooting

### Common Issues

1. **Image not found**: Make sure the Docker image is pushed to the correct repository.

2. **Secret not found**: Ensure the secrets exist in Secret Manager and are referenced correctly.

3. **Platform compatibility**: Build Docker images with `--platform linux/amd64` for Cloud Run compatibility.

4. **VPC Connector**: If Redis connection fails, check that the VPC connector is properly configured.

## Monitoring and Logs

- **Cloud Run Logs**: https://console.cloud.google.com/run/detail/europe-west1/dev-fraud-detection-api/logs
- **Cloud Monitoring**: https://console.cloud.google.com/monitoring/dashboards

## Updating the Deployment

To update the deployment:

1. Make changes to the code
2. Build and push a new Docker image
3. Deploy to Cloud Run using the same command as above

The deployment script (`deploy.sh`) can be used to automate this process.

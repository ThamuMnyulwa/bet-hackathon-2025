#!/bin/bash
set -e

# Change to the project root directory
cd "$(dirname "$0")"

# Set variables
PROJECT_ID="studied-zephyr-460821-n8"
REGION="europe-west1"
REPO="dev-fraud-api-repo"
IMAGE_NAME="fraud-api"
TAG="latest"
FULL_IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${TAG}"

# Display header
echo "====================================="
echo "Fraud Detection API Deployment Script"
echo "====================================="

# Function to display help
show_help() {
  echo "Usage: ./deploy.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  --build              Build Docker image locally"
  echo "  --push               Push Docker image to Google Artifact Registry"
  echo "  --deploy             Deploy to Cloud Run"
  echo "  --all                Build, push, and deploy"
  echo "  --help               Show this help message"
  echo ""
  echo "Example:"
  echo "  ./deploy.sh --all"
}

# Function to build Docker image
build_image() {
  echo "Building Docker image: ${IMAGE_NAME}:${TAG}"
  docker build --platform linux/amd64 -t ${IMAGE_NAME}:${TAG} .
  echo "✅ Docker image built successfully!"
}

# Function to push Docker image to Artifact Registry
push_image() {
  echo "Checking gcloud authentication..."
  gcloud auth print-access-token > /dev/null || {
    echo "❌ Error: Not authenticated with gcloud. Please run 'gcloud auth login' first."
    exit 1
  }

  echo "Configuring Docker to use gcloud credentials..."
  gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

  echo "Tagging Docker image for Artifact Registry..."
  docker tag ${IMAGE_NAME}:${TAG} ${FULL_IMAGE_NAME}

  echo "Pushing image to Artifact Registry: ${FULL_IMAGE_NAME}"
  docker push ${FULL_IMAGE_NAME}
  echo "✅ Docker image pushed successfully!"
}

# Function to deploy to Cloud Run
deploy_to_cloud_run() {
  echo "Deploying to Cloud Run..."
  
  # Deploy to Cloud Run
  gcloud run deploy dev-fraud-detection-api \
    --image=${FULL_IMAGE_NAME} \
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
  
  echo "✅ Deployment to Cloud Run successful!"
  
  # Get the service URL
  SERVICE_URL=$(gcloud run services describe dev-fraud-detection-api --region=${REGION} --format='value(status.url)')
  echo "🚀 Service URL: ${SERVICE_URL}"
}

# Parse command line arguments
if [ $# -eq 0 ]; then
  show_help
  exit 0
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --build)
      BUILD=true
      shift
      ;;
    --push)
      PUSH=true
      shift
      ;;
    --deploy)
      DEPLOY=true
      shift
      ;;
    --all)
      BUILD=true
      PUSH=true
      DEPLOY=true
      shift
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo "❌ Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Execute requested actions
if [ "$BUILD" = true ]; then
  build_image
fi

if [ "$PUSH" = true ]; then
  push_image
fi

if [ "$DEPLOY" = true ]; then
  deploy_to_cloud_run
fi

echo "✨ Done!"
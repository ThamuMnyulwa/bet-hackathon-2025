#!/bin/bash
set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

# Set variables
PROJECT_ID="studied-zephyr-460821-n8"
REGION="europe-west1"
REPO="dev-fraud-api-repo"
IMAGE_NAME="fraud-api"
TAG="latest"
FULL_IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE_NAME:$TAG"

# Check if gcloud is authenticated
echo "Checking gcloud authentication..."
gcloud auth print-access-token > /dev/null || {
    echo "Error: Not authenticated with gcloud. Please run 'gcloud auth login' first."
    exit 1
}

# Configure Docker to use gcloud credentials
echo "Configuring Docker to use gcloud credentials..."
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# Tag the local image with the Artifact Registry path
echo "Tagging Docker image for Artifact Registry..."
docker tag $IMAGE_NAME:$TAG $FULL_IMAGE_NAME

# Push the image to Artifact Registry
echo "Pushing image to Artifact Registry: $FULL_IMAGE_NAME"
docker push $FULL_IMAGE_NAME

echo "Docker image pushed successfully!"

#!/bin/bash
set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

# Set variables
IMAGE_NAME="fraud-api"
TAG="latest"

# Build the Docker image
echo "Building Docker image: $IMAGE_NAME:$TAG"
docker build -t $IMAGE_NAME:$TAG .

echo "Docker image built successfully!"
echo "To run the container locally:"
echo "docker run -p 8080:8080 -e GOOGLE_API_KEY=your_api_key $IMAGE_NAME:$TAG"

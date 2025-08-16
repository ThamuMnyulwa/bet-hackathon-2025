# Fraud Detection API

A FastAPI-based API for fraud detection using Google ADK agents.

## Local Development

### Prerequisites

- Python 3.13+
- uv package manager
- Docker (for containerization)

### Setup

1. Clone the repository
2. Install dependencies:

```bash
cd packages/api
uv sync
```

3. Create a `.env` file from the example:

```bash
cp .env-example .env
```

4. Add your Google API key to the `.env` file

5. Run the development server:

```bash
uv run uvicorn app.main:app --reload
```

## Docker Deployment

### Using Docker Compose (Recommended)

Docker Compose provides a complete local development environment with Redis included.

1. Create a `.env` file with your Google API key:

```bash
echo "GOOGLE_API_KEY=your_api_key_here" > .env
```

2. Start the services:

```bash
docker-compose up
```

This will start both the API and Redis services. The API will be available at http://localhost:8080.

### Building and Running the Docker Container

```bash
# Build the Docker image
docker build -t fraud-api:latest .

# Run the container
docker run -p 8080:8080 -e GOOGLE_API_KEY=your_api_key_here fraud-api:latest
```

### Using the Deployment Script

The `deploy.sh` script provides a convenient way to build, push, and deploy the application:

```bash
# Show help
./deploy.sh --help

# Build the Docker image locally
./deploy.sh --build

# Push to Google Artifact Registry
./deploy.sh --push

# Deploy to Cloud Run
./deploy.sh --deploy

# Do all of the above
./deploy.sh --all
```

### Pushing to Google Artifact Registry Manually

1. Authenticate with Google Cloud:

```bash
gcloud auth login
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

2. Tag and push the image:

```bash
PROJECT_ID="studied-zephyr-460821-n8"
REGION="europe-west1"
REPO="dev-fraud-api-repo"
IMAGE_NAME="fraud-api"
TAG="latest"

# Tag the image
docker tag ${IMAGE_NAME}:${TAG} ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${TAG}

# Push the image
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:${TAG}
```

## API Documentation

Once the API is running, you can access the interactive API documentation at:

- Local: http://localhost:8000/docs
- Docker: http://localhost:8080/docs

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `GOOGLE_API_KEY` | Google API key for Gemini | Required |
| `GOOGLE_GENAI_USE_VERTEXAI` | Use Vertex AI instead of direct API | FALSE |
| `TRANSUNION_API_KEY` | TransUnion API key | Optional |
| `REDIS_HOST` | Redis host | localhost or redis |
| `REDIS_PORT` | Redis port | 6379 |
| `ENVIRONMENT` | Environment (dev, staging, prod) | dev |

## Troubleshooting

### Docker Issues

If you encounter issues with the Docker container not finding modules, the Dockerfile is configured to install dependencies directly using pip:

```dockerfile
# Install dependencies directly using pip
RUN pip install fastapi uvicorn[standard] google-adk google-generativeai structlog pandas httpx
```

This ensures that all required packages are available in the container.
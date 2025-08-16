#!/bin/bash

# Script to initialize Terraform backend with GCS bucket
# This script helps set up the Terraform state bucket before running terraform init

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Terraform Backend Initialization Script${NC}"
echo "========================================="

# Check if project ID is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Project ID not provided${NC}"
    echo "Usage: ./init-backend.sh <PROJECT_ID>"
    echo "Example: ./init-backend.sh my-gcp-project"
    exit 1
fi

PROJECT_ID=$1
BUCKET_NAME="${PROJECT_ID}-fraud-detection-tf-state"
REGION=${2:-us-central1}

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Bucket Name: $BUCKET_NAME"
echo "  Region: $REGION"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install the Google Cloud SDK first"
    exit 1
fi

# Set the project
echo -e "${GREEN}Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Check if bucket already exists
echo -e "${GREEN}Checking if bucket exists...${NC}"
if gsutil ls -b gs://$BUCKET_NAME &> /dev/null; then
    echo -e "${YELLOW}Bucket $BUCKET_NAME already exists${NC}"
else
    echo -e "${GREEN}Creating GCS bucket for Terraform state...${NC}"
    gsutil mb -p $PROJECT_ID -l $REGION -b on gs://$BUCKET_NAME
    
    # Enable versioning
    echo -e "${GREEN}Enabling versioning on bucket...${NC}"
    gsutil versioning set on gs://$BUCKET_NAME
    
    # Set lifecycle rules
    echo -e "${GREEN}Setting lifecycle rules...${NC}"
    cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 90,
          "isLive": false
        }
      }
    ]
  }
}
EOF
    gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME
    rm /tmp/lifecycle.json
    
    echo -e "${GREEN}Bucket created successfully!${NC}"
fi

# Update backend.tf with the actual project ID
echo -e "${GREEN}Updating backend.tf with project ID...${NC}"
BACKEND_FILE="../backend.tf"
if [ -f "$BACKEND_FILE" ]; then
    # Create backup
    cp $BACKEND_FILE ${BACKEND_FILE}.backup
    
    # Replace PROJECT_ID with actual project ID
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/PROJECT_ID-fraud-detection-tf-state/${BUCKET_NAME}/g" $BACKEND_FILE
    else
        # Linux
        sed -i "s/PROJECT_ID-fraud-detection-tf-state/${BUCKET_NAME}/g" $BACKEND_FILE
    fi
    
    echo -e "${GREEN}backend.tf updated${NC}"
else
    echo -e "${YELLOW}Warning: backend.tf not found. Please update it manually.${NC}"
fi

echo ""
echo -e "${GREEN}Backend initialization complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Return to the terraform directory: cd .."
echo "2. Initialize Terraform: terraform init"
echo "3. Create a terraform.tfvars file with your variables"
echo "4. Run: terraform plan"
echo ""
echo -e "${YELLOW}Note: If you're migrating from local state, you may need to run:${NC}"
echo "  terraform init -migrate-state"
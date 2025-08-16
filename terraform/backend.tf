# Terraform backend configuration for state management
# Note: Backend configuration does not support variables
# You must replace PROJECT_ID with your actual project ID

terraform {
  backend "gcs" {
    # Replace PROJECT_ID with your actual GCP project ID
    bucket = "studied-zephyr-460821-n8-fraud-detection-tf-state"
    prefix = "terraform/state"
  }
}
# GCS bucket for Terraform state storage
# This bucket will store the Terraform state files

# Since we're already using this bucket for state, we'll import it instead of creating it
# Use data source to reference the existing bucket
data "google_storage_bucket" "terraform_state" {
  name = "${var.project_id}-fraud-detection-tf-state"
}

# IAM policy for the state bucket
resource "google_storage_bucket_iam_member" "state_bucket_admin" {
  bucket = data.google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Output the bucket name for reference
output "terraform_state_bucket" {
  value       = data.google_storage_bucket.terraform_state.name
  description = "GCS bucket for Terraform state storage"
}
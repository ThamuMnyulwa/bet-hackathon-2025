# Main Terraform configuration for Fraud Detection API Infrastructure

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# Configure the Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "redis.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com",
    "aiplatform.googleapis.com"
  ])

  service            = each.value
  disable_on_destroy = false
}

# Use the default network instead of creating a new VPC
data "google_compute_network" "default" {
  name = "default"
}

# VPC Connector for Cloud Run
resource "google_vpc_access_connector" "connector" {
  name          = "${var.environment}-fraud-api-connector"
  region        = var.region
  network       = data.google_compute_network.default.name
  ip_cidr_range = var.connector_cidr
  
  depends_on = [google_project_service.required_apis]
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "${var.environment}-fraud-api-repo"
  description   = "Docker repository for fraud detection API"
  format        = "DOCKER"
  
  depends_on = [google_project_service.required_apis]
}

# Secret Manager for API keys
resource "google_secret_manager_secret" "api_key" {
  secret_id = "${var.environment}-google-api-key"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret" "transunion_api_key" {
  secret_id = "${var.environment}-transunion-api-key"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

# Service Account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = "${var.environment}-fraud-api-sa"
  display_name = "Fraud Detection API Service Account"
  description  = "Service account for Cloud Run fraud detection API"
}

# IAM roles for service account
resource "google_project_iam_member" "cloud_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "vertex_ai_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "redis_editor" {
  project = var.project_id
  role    = "roles/redis.editor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Redis instance for caching
resource "google_redis_instance" "cache" {
  name               = "${var.environment}-fraud-api-cache"
  tier               = var.redis_tier
  memory_size_gb     = var.redis_memory_gb
  region             = var.region
  authorized_network = data.google_compute_network.default.id
  
  redis_version = "REDIS_7_0"
  display_name  = "Fraud API Cache"
  
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }
  
  depends_on = [google_project_service.required_apis]
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "fraud_api" {
  name     = "${var.environment}-fraud-detection-api"
  location = var.region
  
  template {
    service_account = google_service_account.cloud_run_sa.email
    
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
    
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
    
    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/fraud-api:${var.image_tag}"
      
      ports {
        container_port = 8080
      }
      
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      
      env {
        name  = "GOOGLE_GENAI_USE_VERTEXAI"
        value = "TRUE"
      }
      
      env {
        name  = "REDIS_HOST"
        value = google_redis_instance.cache.host
      }
      
      env {
        name  = "REDIS_PORT"
        value = google_redis_instance.cache.port
      }
      
      env {
        name = "GOOGLE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_key.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name = "TRANSUNION_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.transunion_api_key.secret_id
            version = "latest"
          }
        }
      }
      
      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        
        cpu_idle = true
      }
      
      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 10
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }
      
      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 30
        timeout_seconds       = 3
        period_seconds        = 30
        failure_threshold     = 3
      }
    }
  }
  
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_vpc_access_connector.connector,
    google_redis_instance.cache
  ]
}

# Allow unauthenticated access (configure based on requirements)
resource "google_cloud_run_service_iam_member" "allow_unauthenticated" {
  count    = var.allow_unauthenticated ? 1 : 0
  location = google_cloud_run_v2_service.fraud_api.location
  service  = google_cloud_run_v2_service.fraud_api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Monitoring Dashboard
resource "google_monitoring_dashboard" "fraud_api_dashboard" {
  dashboard_json = jsonencode({
    displayName = "${var.environment} Fraud API Dashboard"
    gridLayout = {
      widgets = [
        {
          title = "Request Count"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"${google_cloud_run_v2_service.fraud_api.name}\""
                  aggregation = {
                    alignmentPeriod = "60s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        },
        {
          title = "Latency"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"${google_cloud_run_v2_service.fraud_api.name}\" metric.type=\"run.googleapis.com/request_latencies\""
                  aggregation = {
                    alignmentPeriod = "60s"
                    perSeriesAligner = "ALIGN_PERCENTILE_95"
                  }
                }
              }
            }]
          }
        }
      ]
    }
  })
}

# Outputs
output "service_url" {
  value       = google_cloud_run_v2_service.fraud_api.uri
  description = "The URL of the deployed Cloud Run service"
}

output "redis_host" {
  value       = google_redis_instance.cache.host
  description = "Redis instance host"
  sensitive   = true
}

output "redis_port" {
  value       = google_redis_instance.cache.port
  description = "Redis instance port"
}

output "artifact_registry_url" {
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
  description = "Artifact Registry URL for Docker images"
}

output "service_account_email" {
  value       = google_service_account.cloud_run_sa.email
  description = "Service account email for Cloud Run"
}

output "vpc_connector_id" {
  value       = google_vpc_access_connector.connector.id
  description = "VPC Connector ID"
}

output "google_api_key_secret" {
  value       = google_secret_manager_secret.api_key.name
  description = "Google API key secret name"
}

output "transunion_api_key_secret" {
  value       = google_secret_manager_secret.transunion_api_key.name
  description = "TransUnion API key secret name"
}

output "monitoring_dashboard_name" {
  value       = google_monitoring_dashboard.fraud_api_dashboard.id
  description = "Monitoring dashboard ID"
}

output "deployment_environment" {
  value       = var.environment
  description = "Deployment environment (dev, staging, prod)"
}

output "project_id" {
  value       = var.project_id
  description = "GCP Project ID"
}

output "region" {
  value       = var.region
  description = "Deployment region"
}
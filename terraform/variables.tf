# Variable definitions for Fraud Detection API Infrastructure

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "project_name" {
  description = "GCP Project Name (for labeling and documentation)"
  type        = string
  default     = ""
}

variable "region" {
  description = "GCP Region for deployment"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# Cloud Run Configuration
variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "cpu_limit" {
  description = "CPU limit for Cloud Run instances"
  type        = string
  default     = "2"
}

variable "memory_limit" {
  description = "Memory limit for Cloud Run instances"
  type        = string
  default     = "2Gi"
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated access to Cloud Run service"
  type        = bool
  default     = false
}

# API Keys (to be stored in Secret Manager)
variable "google_api_key" {
  description = "Google/Gemini API Key for AI services"
  type        = string
  sensitive   = true
}

variable "transunion_api_key" {
  description = "TransUnion API Key for fraud detection data"
  type        = string
  sensitive   = true
  default     = ""
}

# Redis Cache Configuration
variable "redis_memory_gb" {
  description = "Redis instance memory size in GB"
  type        = number
  default     = 1
}

variable "redis_tier" {
  description = "Redis instance tier"
  type        = string
  default     = "STANDARD_HA"
  
  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.redis_tier)
    error_message = "Redis tier must be BASIC or STANDARD_HA."
  }
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable Cloud Monitoring dashboard"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for monitoring alerts"
  type        = string
  default     = ""
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR range for VPC"
  type        = string
  default     = "10.0.0.0/24"
}

variable "connector_cidr" {
  description = "CIDR range for VPC connector"
  type        = string
  default     = "10.1.0.0/28"
}

# Container Image Configuration
variable "container_registry" {
  description = "Container registry type (artifact-registry or gcr)"
  type        = string
  default     = "artifact-registry"
  
  validation {
    condition     = contains(["artifact-registry", "gcr"], var.container_registry)
    error_message = "Container registry must be artifact-registry or gcr."
  }
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}

# Deployment Configuration
variable "deploy_bucket" {
  description = "GCS bucket for deployment artifacts"
  type        = string
  default     = ""
}

variable "enable_cdn" {
  description = "Enable Cloud CDN for static assets"
  type        = bool
  default     = false
}

# Labels for resource organization
variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default = {
    team        = "fraud-detection"
    managed-by  = "terraform"
    cost-center = "security"
  }
}

# Backup and Disaster Recovery
variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

# Feature Flags
variable "enable_transunion_integration" {
  description = "Enable TransUnion API integration"
  type        = bool
  default     = true
}

variable "enable_vertex_ai" {
  description = "Use Vertex AI instead of Gemini API"
  type        = bool
  default     = true
}

variable "enable_rate_limiting" {
  description = "Enable API rate limiting"
  type        = bool
  default     = true
}

variable "rate_limit_requests_per_minute" {
  description = "Maximum requests per minute when rate limiting is enabled"
  type        = number
  default     = 100
}
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Suffix for the layer name (common-corpus-layer-<environment>)"
  type        = string
  default     = "dev"
}

variable "layer_zip_path" {
  description = "Path to the layer zip built by npm run build:layer"
  type        = string
  default     = "../common-corpus-layer.zip"
}

variable "aws_region" {
  description = "AWS region for Lambda deployment"
  type        = string
  default     = "us-east-1"
}

variable "CONSUMER_KEY" {
  description = "Tumblr consumer key"
  type        = string
  sensitive   = true
}

variable "CONSUMER_SECRET" {
  description = "Tumblr consumer secret"
  type        = string
  sensitive   = true
}

variable "TOKEN" {
  description = "Tumblr access TOKEN"
  type        = string
  sensitive   = true
}

variable "TOKEN_SECRET" {
  description = "Tumblr TOKEN secret"
  type        = string
  sensitive   = true
}

variable "POST_LIVE" {
  description = "Whether to post live to Tumblr (true/false)"
  type        = string
  default     = "true"
}

variable "corpora_filter" {
  description = "Optional filter for corpus selection"
  type        = string
  default     = ""
}

variable "match_pattern" {
  description = "Pattern matching configuration for list generation"
  type        = string
  default     = ""
}

variable "method" {
  description = "List generation method"
  type        = string
  default     = "clue_combo"
}

variable "schedule_expression" {
  description = "EventBridge schedule expression (e.g., 'rate(1 hour)' or 'cron(0 12 * * ? *)')"
  type        = string
  default     = "rate(1 hour)"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

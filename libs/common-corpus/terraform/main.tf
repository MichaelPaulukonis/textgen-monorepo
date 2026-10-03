# Common Corpus Lambda layer. Apps pin a specific version via
# data "aws_lambda_layer_version" in apps/<app>/terraform/main.tf.
#
# Publish a new version:
#   cd libs/common-corpus && npm run build:layer
#   cd terraform && terraform init && terraform plan && terraform apply
# then bump the pinned version in both apps.

terraform {
  backend "s3" {
    bucket  = "textgen-tfstate-129701576546"
    key     = "common-corpus-layer/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_lambda_layer_version" "common_corpus_layer" {
  filename                 = var.layer_zip_path
  layer_name               = "common-corpus-layer-${var.environment}"
  description              = "Common Corpus text collection for NLP/NLG (${var.environment})"
  compatible_runtimes      = ["nodejs18.x", "nodejs20.x", "nodejs22.x"]
  compatible_architectures = ["x86_64"]

  # New zip contents -> new layer version
  source_code_hash = filebase64sha256(var.layer_zip_path)

  lifecycle {
    create_before_destroy = true
    # Path moved when this config left the generated layer-only/ subdir;
    # a path change alone must not publish a new version
    ignore_changes = [filename]
  }
}

output "layer_arn" {
  value = aws_lambda_layer_version.common_corpus_layer.arn
}

output "layer_version" {
  value = aws_lambda_layer_version.common_corpus_layer.version
}

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Reference to existing common-corpus layer
data "aws_lambda_layer_version" "common_corpus_layer" {
  layer_name = "common-corpus-layer-dev"
  version    = 1
}

# Lambda function
resource "aws_lambda_function" "listmania" {
  filename         = "listmania-lambda.zip"
  function_name    = "listmania"
  role            = aws_iam_role.lambda_role.arn
  handler         = "lambda/index.handler"
  source_code_hash = filebase64sha256("listmania-lambda.zip")
  runtime         = "nodejs22.x"
  timeout         = 60
  memory_size      = 512

  layers = [data.aws_lambda_layer_version.common_corpus_layer.arn]

  environment {
    variables = {
      CONSUMER_KEY    = var.CONSUMER_KEY
      CONSUMER_SECRET = var.CONSUMER_SECRET
      TOKEN          = var.TOKEN
      TOKEN_SECRET   = var.TOKEN_SECRET
      POST_LIVE      = var.POST_LIVE
      CORPORA_FILTER = var.corpora_filter
      MATCH_PATTERN  = var.match_pattern
      METHOD         = var.method
    }
  }
}

# EventBridge rule for scheduling (replacing Heroku scheduler)
resource "aws_cloudwatch_event_rule" "listmania_schedule" {
  name                = "listmania-schedule"
  description         = "Trigger listmania Lambda for list generation and posting"
  schedule_expression = var.schedule_expression
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.listmania_schedule.name
  target_id = "TargetListmaniaLambda"
  arn       = aws_lambda_function.listmania.arn

  # Optional: Pass custom parameters to Lambda
  # Comment out or remove this block to use default EventBridge event format
  input = jsonencode({
    source        = "aws.events"
    detail-type   = "Scheduled Event"
    corporaFilter = var.corpora_filter
    matchPattern  = var.match_pattern
    method        = var.method
  })
}

# Example: Additional schedule with different parameters (commented out)
# resource "aws_cloudwatch_event_rule" "listmania_schedule_literature" {
#   name                = "listmania-schedule-literature"
#   description         = "Trigger listmania for literature-only lists"
#   schedule_expression = "rate(12 hours)"
# }
#
# resource "aws_cloudwatch_event_target" "lambda_target_literature" {
#   rule      = aws_cloudwatch_event_rule.listmania_schedule_literature.name
#   target_id = "TargetListmaniaLambdaLiterature"
#   arn       = aws_lambda_function.listmania.arn
#
#   input = jsonencode({
#     source        = "aws.events"
#     corporaFilter = "literature"
#     method        = "clue_combo"
#   })
# }
#
# resource "aws_lambda_permission" "allow_eventbridge_literature" {
#   statement_id  = "AllowExecutionFromEventBridgeLiterature"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.listmania.function_name
#   principal     = "events.amazonaws.com"
#   source_arn    = aws_cloudwatch_event_rule.listmania_schedule_literature.arn
# }

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.listmania.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.listmania_schedule.arn
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "listmania-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# CloudWatch Log Group for Lambda logs
resource "aws_cloudwatch_log_group" "listmania_logs" {
  name              = "/aws/lambda/${aws_lambda_function.listmania.function_name}"
  retention_in_days = var.log_retention_days
}

# Alerting: generate-poem.js swallows exhausted retries (logs a marker, never
# throws), so Lambda Errors alone misses generation failures.

locals {
  log_group_name = "/aws/lambda/${aws_lambda_function.poeticalbot.function_name}"
}

resource "aws_sns_topic" "alerts" {
  name = "poeticalbot-alerts"
}

# Requires clicking the confirmation link AWS emails after apply
resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_log_metric_filter" "exhausted" {
  name           = "poeticalbot-exhausted"
  log_group_name = local.log_group_name
  pattern        = "\"POETICALBOT_EXHAUSTED\""

  metric_transformation {
    name          = "Exhausted"
    namespace     = "PoeticalBot"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "exhausted" {
  alarm_name          = "poeticalbot-exhausted"
  alarm_description   = "All poem generation attempts failed"
  namespace           = "PoeticalBot"
  metric_name         = aws_cloudwatch_log_metric_filter.exhausted.metric_transformation[0].name
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# Includes timeouts, which count as errors
resource "aws_cloudwatch_metric_alarm" "errors" {
  alarm_name          = "poeticalbot-errors"
  alarm_description   = "Lambda invocation errors (crashes or timeouts)"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.poeticalbot.function_name }
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# Early warning: max run ~15s after the sentencify fix; timeout is 120s
resource "aws_cloudwatch_metric_alarm" "slow" {
  alarm_name          = "poeticalbot-slow"
  alarm_description   = "Invocation took >60s, approaching the 120s timeout"
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  dimensions          = { FunctionName = aws_lambda_function.poeticalbot.function_name }
  statistic           = "Maximum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 60000
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

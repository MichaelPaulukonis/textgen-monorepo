# AWS Configuration
aws_region = "us-east-1"

# Tumblr API Credentials
# Get these from https://www.tumblr.com/oauth/apps
consumer_key    = "ikkf4hNpjqLD9Fz5ivsyLNuerArUyP1Tpa13LQ9BBbaaDrRyKw"
consumer_secret = "7kC0aEg1EBDjuQBJmOCeTIqUlKgbESLBItX1AlPWeT65Uzovmk"
token          = "loeNpLnXpZBDow4S0I7j2PlXsVHaBdiasjCK7J7lBetpN8OtQf"
token_secret   = "Sp1bRy1pkFG0Y5WHM6uVWyb8eBkJMrf7Xanlpaoy8jIHihq6kl"

# Posting Configuration
post_live = "true"  # Set to "false" for testing without posting

# Scheduling Configuration
# Examples:
# - "rate(1 hour)" - every hour
# - "rate(6 hours)" - every 6 hours
# - "cron(0 12 * * ? *)" - daily at noon UTC
schedule_expression = "rate(1 hour)"

# Logging Configuration
log_retention_days = 7  # CloudWatch log retention in days

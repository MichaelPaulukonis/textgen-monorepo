# Common Corpus Deployment Options

Choose the right deployment option based on your use case.

## Option 1: Layer Only 📦

**Use when:** You want to use Common Corpus within your own Lambda functions.

### What You Get
- ✅ Lambda layer with pre-extracted texts (no runtime zip extraction)
- ✅ Minimal infrastructure and costs
- ✅ Use as dependency in your own functions

### What You Don't Get
- ❌ No HTTP endpoints
- ❌ No API Gateway
- ❌ No standalone Lambda functions

### Deployment
```bash
cd terraform/
./deploy-layer-only.sh
```

This generates a `terraform/layer-only/` directory from `layer-only-clean.tf` (its own `main.tf`, `variables.tf`, `terraform.tfvars`) and deploys from there, isolated from the Full API config.

### Usage Example
```javascript
// Your Lambda function
const Corpora = require('/opt/nodejs/node_modules/common-corpus');

exports.handler = async (event) => {
    const corpus = new Corpora({ maxCacheSize: 5 });
    const texts = corpus.filter(event.category || 'literature');
    
    // Your business logic here
    return processTexts(texts);
};
```

### Terraform Configuration
```hcl
resource "aws_lambda_function" "my_function" {
    # ... your function config ...
    layers = [aws_lambda_layer_version.common_corpus_layer.arn]
}
```

### Monthly Cost Estimate
- **Layer storage**: Free
- **Your function execution**: $0.20 per 1M requests + compute time
- **Total**: ~$2-10/month (depending on usage)

---

## Option 2: Full API 🌐

**Use when:** You want Common Corpus as a REST API service for multiple applications.

### What You Get
- ✅ Lambda layer with pre-extracted texts
- ✅ REST API with HTTP endpoints
- ✅ API Gateway with CORS support
- ✅ Dedicated Lambda functions for API and batch processing
- ✅ CloudWatch monitoring and alarms
- ✅ Production-ready infrastructure

### API Endpoints
```
GET /health              - Health check and system status
GET /texts               - List all available texts
GET /texts/{category}    - Filter texts by category
GET /text/{name}         - Get specific text content
```

### Deployment
```bash
cd terraform/
terraform init
terraform apply
```

`main.tf` is the Full API config by default -- no file-swapping needed.

### Usage Examples

#### HTTP API Calls
```bash
# Health check
curl https://api-id.execute-api.region.amazonaws.com/dev/health

# List all texts
curl https://api-id.execute-api.region.amazonaws.com/dev/texts

# Get cyberpunk texts
curl https://api-id.execute-api.region.amazonaws.com/dev/texts/cyberpunk

# Get specific text with sentences
curl "https://api-id.execute-api.region.amazonaws.com/dev/text/neuromancer?sentences=true"
```

#### JavaScript/Frontend Usage
```javascript
// Frontend application
const apiUrl = 'https://your-api-gateway-url/dev';

// Get texts by category
const response = await fetch(`${apiUrl}/texts/cyberpunk`);
const data = await response.json();
console.log(`Found ${data.count} cyberpunk texts`);

// Get specific text
const textResponse = await fetch(`${apiUrl}/text/neuromancer`);
const textData = await textResponse.json();
console.log(textData.content);
```

#### Python Usage
```python
import requests

api_url = "https://your-api-gateway-url/dev"

# Get texts
response = requests.get(f"{api_url}/texts/literature")
texts = response.json()

# Process each text
for text in texts['texts']:
    text_response = requests.get(f"{api_url}/text/{text['name']}")
    content = text_response.json()['content']
    # Process content...
```

### Monthly Cost Estimate
- **Lambda execution**: $0.20 per 1M requests + compute time
- **API Gateway**: $3.50 per 1M requests
- **CloudWatch logs**: ~$0.50 per GB
- **Total**: ~$15-50/month (depending on usage)

---

## Comparison Table

| Feature | Layer Only | Full API |
|---------|------------|----------|
| **Lambda Layer** | ✅ | ✅ |
| **HTTP Endpoints** | ❌ | ✅ |
| **API Gateway** | ❌ | ✅ |
| **Monitoring** | Basic | Full |
| **CORS Support** | N/A | ✅ |
| **Multi-app Access** | Via layer | Via HTTP |
| **Setup Complexity** | Simple | Moderate |
| **Monthly Cost** | $2-10 | $15-50 |
| **Use in Lambda** | ✅ Direct | ✅ Via HTTP |
| **Use in Web Apps** | ❌ | ✅ |
| **Use in Mobile** | ❌ | ✅ |

---

## Decision Guide

### Choose Layer Only If:
- ✅ You're building Lambda functions that need text processing
- ✅ You want minimal infrastructure and costs
- ✅ You don't need HTTP endpoints
- ✅ You're building internal microservices
- ✅ You want direct, fast access to texts

### Choose Full API If:
- ✅ You want to expose Common Corpus to multiple applications
- ✅ You're building web or mobile applications
- ✅ You need HTTP REST endpoints
- ✅ You want a shared text service for your team/organization
- ✅ You need CORS support for browser applications
- ✅ You want production monitoring and alerting

---

## Switching Between Options

Layer Only and Full API are separate deployments, not a single toggled config -- Full API deploys `terraform/main.tf` directly; Layer Only deploys an isolated `terraform/layer-only/` directory (its own state) generated by `deploy-layer-only.sh`. They can coexist. To stop using one, `terraform destroy` in that deployment's directory.

```bash
# Add Full API alongside an existing Layer Only deployment
cd terraform/
terraform init && terraform apply

# Add Layer Only alongside an existing Full API deployment
cd terraform/
./deploy-layer-only.sh

# Tear down Layer Only only
cd terraform/layer-only/
terraform destroy
```

---

## Quick Start Commands

### Layer Only
```bash
cd terraform/
./deploy-layer-only.sh
```

### Full API
```bash
cd terraform/
terraform init && terraform apply
```

Both options use the same optimized Lambda layer with pre-extracted texts, so you get the performance benefits regardless of which deployment option you choose!
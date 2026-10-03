# Common Corpus Lambda layer

Publishes `common-corpus-layer.zip` as the `common-corpus-layer-dev` Lambda layer. That's all this stack does. State lives in S3 (`common-corpus-layer/terraform.tfstate`).

## Publish a new layer version

```bash
cd libs/common-corpus
npm run build:layer        # builds and verifies common-corpus-layer.zip
cd terraform
terraform init
terraform plan             # expect 1 to add when the zip changed, no changes otherwise
terraform apply
```

Layer versions are immutable: a changed zip publishes a new version, and the old one stays. Then bump the pinned `version` in the `data "aws_lambda_layer_version"` block of `apps/poeticalbot/terraform/main.tf` and `apps/listmania/terraform/main.tf`, and deploy both apps.

## History

An API Gateway + Lambda "corpus API" config used to live here but was never deployed, and it was deleted under textgen-monorepo-b6x. Thoughts on serving the corpus to other consumers (static S3 + manifest first, no API) are in bead tg-5.

#!/bin/sh
# Idempotent: creates the bucket if missing and (re)applies the public-read policy for public/*.
set -eu

: "${S3_ENDPOINT:?}" "${S3_BUCKET:?}" "${AWS_ACCESS_KEY_ID:?}" "${AWS_SECRET_ACCESS_KEY:?}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
AWS="aws --endpoint-url ${S3_ENDPOINT}"

attempt=0
until $AWS s3api list-buckets >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "rustfs not reachable at ${S3_ENDPOINT}" >&2
    exit 1
  fi
  sleep 2
done

if ! $AWS s3api head-bucket --bucket "$S3_BUCKET" >/dev/null 2>&1; then
  $AWS s3api create-bucket --bucket "$S3_BUCKET"
fi

sed "s/__BUCKET__/${S3_BUCKET}/g" /init/policy.template.json > /tmp/policy.json
$AWS s3api put-bucket-policy --bucket "$S3_BUCKET" --policy file:///tmp/policy.json
echo "bucket ${S3_BUCKET} ready, public read on public/*"

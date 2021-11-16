#!/bin/bash

set -e

EXT_DIR=ext
OUT_DIR=out

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"
cp -r "$EXT_DIR" "$OUT_DIR/ext"


# The config files have some values in them we can't keep in the
# public repository, so we'll fetch them here and update the config
# files with the new values.
function getparameterstorevalue {
  AWS_REGION="$1"
  PARAMETER_STORE_KEY="$2"
  aws --region="$AWS_REGION" ssm get-parameter \
    --name "$PARAMETER_STORE_KEY" \
    --output text \
    --query Parameter.Value \
    --with-decryption
}
CONF_FILEPATH="$OUT_DIR/ext/background/conf/prod.js"
if [[ ! -f "$CONF_FILEPATH" ]]; then
  echo "Configuration file \"${CONF_FILEPATH}\" not found"
  exit 1
fi
SEGMENT_WRITE_KEY=$(getparameterstorevalue "us-east-1" /range-sync/segment/chrome-extension-write-key)
# Append lines to the conf file at the top of the CONFIG object.
sed -i '' "/^const CONFIG = {$/a \\
  segment_write_key: '${SEGMENT_WRITE_KEY}',\\
" "$CONF_FILEPATH"

# Zip up the final package.
(cd "$OUT_DIR" && zip -r ext.zip ext)

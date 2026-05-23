#!/bin/bash

# Clean previous build
if [ -f "antigravity-theme.zip" ]; then
  rm antigravity-theme.zip
fi

# Package active directories
zip -r antigravity-theme.zip assets config layout locales sections snippets templates -x "*.DS_Store" -x "__MACOSX"

echo "=========================================================="
echo "  Success: antigravity-theme.zip has been generated!     "
echo "  Location: /Users/anshulkumar/Desktop/antigravity shopify "
echo "=========================================================="
echo "  Steps to deploy to Shopify:                             "
echo "  1. Log in to Shopify Admin (yourstore.myshopify.com/admin)"
echo "  2. Go to Online Store -> Themes                         "
echo "  3. Click 'Add Theme' -> 'Upload zip file'               "
echo "  4. Upload 'antigravity-theme.zip'                       "
echo "=========================================================="

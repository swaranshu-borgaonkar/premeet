#!/bin/bash
# Build script for PrepMeet Chrome Extension
# Creates a zip file ready for Chrome Web Store upload

set -e

EXTENSION_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$EXTENSION_DIR/build"
ZIP_NAME="prepmeet-extension.zip"

echo "Building PrepMeet extension..."

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy extension files (exclude dev files)
cp "$EXTENSION_DIR/manifest.json" "$BUILD_DIR/"
cp -r "$EXTENSION_DIR/popup" "$BUILD_DIR/"
cp -r "$EXTENSION_DIR/options" "$BUILD_DIR/"
cp -r "$EXTENSION_DIR/lib" "$BUILD_DIR/"
cp -r "$EXTENSION_DIR/icons" "$BUILD_DIR/"
cp "$EXTENSION_DIR/background.js" "$BUILD_DIR/"

# Remove any dev/docs files from the build
rm -f "$BUILD_DIR"/*.md
rm -f "$BUILD_DIR"/*.sh

# Create zip
cd "$BUILD_DIR"
zip -r "../$ZIP_NAME" . -x "*.DS_Store"

echo "Build complete: extension/$ZIP_NAME"
echo "Size: $(du -h "$EXTENSION_DIR/$ZIP_NAME" | cut -f1)"

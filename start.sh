#!/bin/bash

# Railpack start script for rate-limit-app
set -e

echo "🚀 Starting Rate-Limit App..."

# Install dependencies
echo "📦 Installing dependencies..."
cd server && npm install --production
cd ../client && npm install --production

# Build client
echo "🔨 Building client..."
cd ../client && npm run build

# Start server
echo "🌐 Starting server..."
cd ../server && npm start

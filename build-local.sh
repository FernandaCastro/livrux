#!/bin/bash
set -e

if [ ! -f .env ]; then
  echo "Error: .env file not found at project root"
  exit 1
fi

set -a
source .env
set +a

echo "EXPO_PUBLIC_SUPABASE_URL = $EXPO_PUBLIC_SUPABASE_URL"
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY = ${EXPO_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
echo "EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY = ${EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY:0:10}..."

eas build --profile production --platform android --local

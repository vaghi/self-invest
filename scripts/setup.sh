#!/bin/bash
set -e

echo "==============================="
echo "  Self-Invest Setup"
echo "==============================="

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env

  ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^MASTER_ENCRYPTION_KEY=$/MASTER_ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
  else
    sed -i "s/^MASTER_ENCRYPTION_KEY=$/MASTER_ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
  fi
  echo "Generated encryption key."
else
  echo ".env already exists, skipping."
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building shared package..."
npm run build:shared

echo ""
echo "Starting Docker services (PostgreSQL + Redis)..."
docker compose up -d

echo ""
echo "Waiting for PostgreSQL to be ready..."
until docker exec selfinvest-db pg_isready -U selfinvest > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is ready."

echo ""
echo "Running database migrations..."
cd packages/backend
npx prisma generate
npx prisma db push
cd ../..

echo ""
echo "==============================="
echo "  Setup Complete!"
echo "==============================="
echo ""
echo "Next steps:"
echo "  1. Add your API keys to .env (Alpaca, AI providers)"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:5173"
echo ""
echo "For paper trading (recommended first):"
echo "  - Sign up at https://alpaca.markets"
echo "  - Get paper trading API keys"
echo "  - Add them in the Settings page"
echo ""

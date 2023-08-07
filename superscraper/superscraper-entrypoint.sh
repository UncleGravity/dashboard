#!/usr/bin/env bash
# More info about entrypoint: 
# https://docs.docker.com/engine/reference/builder/#entrypoint
# https://code.visualstudio.com/remote/advancedcontainers/start-processes

echo "Running npm install in /workspaces/dashboard"
cd /workspaces/superscraper
npm run clean
npm install

# Mintable setup
npm --prefix ./scrapers/money/mintable install
npm --prefix ./scrapers/money/mintable run build
mkdir -p ./scrapers/money/mintable/csv/

# Google Takeout Location History Parser setup
npm --prefix ./scrapers/maps/GoogleTakeoutLocationHistoryParser install

# Check if the PostgreSQL server is ready
# TODO check that timecaledb + postgis extensions are installed and DB is ready to accept connections
echo "Waiting for PostgreSQL server to become ready..."
while ! nc -z -v -w 5 "${POSTGRES_URL}" "${POSTGRES_PORT}"; do
  sleep 1
done

# Import geojson data
# TODO Only do it if the table is empty?
echo "Manually importing google maps data..."
node /workspaces/superscraper/scrapers/maps/import-geojson.js

# Start pm2-docker
echo "Starting scrapers..."
pm2-docker start ecosystem.config.js

# NOTE: I think this never runs, because pm2-docker blocks the shell for some reason, even if running with & at the end
# Run command passed in via CMD in Dockerfile
exec "$@"
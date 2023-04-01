#!/usr/bin/env bash
# More info about entrypoint: 
# https://docs.docker.com/engine/reference/builder/#entrypoint
# https://code.visualstudio.com/remote/advancedcontainers/start-processes

echo "Running npm install in /workspaces/dashboard"
cd /workspaces/superscraper
npm run clean
npm install

# echo "Waiting 5 seconds for postgres to start!"
sleep 5
# pm2-docker start ecosystem.config.js

# run command passed in via CMD in Dockerfile
exec "$@"
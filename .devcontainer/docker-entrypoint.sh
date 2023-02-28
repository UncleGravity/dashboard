#!/usr/bin/env bash
# More info about entrypoint: 
# https://docs.docker.com/engine/reference/builder/#entrypoint
# https://code.visualstudio.com/remote/advancedcontainers/start-processes

echo "Running npm install in /workspaces/dashboard"
cd /workspaces/dashboard
npm run clean
npm install

echo "Waiting 6 seconds for postgres to start!"
sleep 6
pm2-docker start db-test.js

# run command passed in via CMD in Dockerfile
exec "$@"
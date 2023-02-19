#!/usr/bin/env bash

echo "Waiting 10 seconds for postgres to start!"
sleep 10
pm2-docker start /workspaces/dashboard/db-test.js

# run command passed in via CMD in Dockerfile
exec "$@"
#!/bin/sh
# More info about entrypoint: 
# https://docs.docker.com/engine/reference/builder/#entrypoint
# https://code.visualstudio.com/remote/advancedcontainers/start-processes

# sleep 5
echo "TIMESCALE ENTRYPOINT, user: $POSTGRES_USER, database: $POSTGRES_DB"

# Wait for PostgreSQL to start
until pg_isready -U $POSTGRES_USER -d $POSTGRES_DB; do
  echo "Waiting for PostgreSQL to start..."
  sleep 1
done
echo "PostgreSQL started."

# Enable PostGIS extension
# psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;'
psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE EXTENSION IF NOT EXISTS postgis CASCADE;'

# Create new schemas
psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA telegraf;'
psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA awair;'
psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA healthkit;'
psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA maps;'
psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA money;' # push this to server
# psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA screentime;'
# psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA oura;' 
# psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA strava;' 

# Set search path for new user
psql -U $POSTGRES_USER -d $POSTGRES_DB -c "ALTER USER $POSTGRES_USER SET search_path = telegraf,awair,healthkit,maps,money,public;"
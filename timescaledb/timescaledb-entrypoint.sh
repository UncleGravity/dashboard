#!/bin/sh
# More info about entrypoint: 
# https://docs.docker.com/engine/reference/builder/#entrypoint
# https://code.visualstudio.com/remote/advancedcontainers/start-processes

# sleep 5
echo "TIMESCALE ENTRYPOINT, user: $POSTGRES_USER, database: $POSTGRES_DB"

# Create new schemas
psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA telegraf;'
# psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE SCHEMA awair;'

# Set search path for new user
psql -U $POSTGRES_USER -d $POSTGRES_DB -c "ALTER USER $POSTGRES_USER SET search_path = telegraf,public;"

# [DEBUG] Create a new table in the "telegraf" schema
# [DEBUG] Initialize the "test_table" with some data
# psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE TABLE telegraf.test_table (id SERIAL PRIMARY KEY, name VARCHAR(50), value INTEGER);'
# psql -U $POSTGRES_USER -d $POSTGRES_DB -c "INSERT INTO telegraf.test_table (name, value) VALUES ('foo', 42), ('bar', 1337);"
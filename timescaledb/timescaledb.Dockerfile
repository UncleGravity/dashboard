FROM timescale/timescaledb:latest-pg14

# The timescaledb docker image has a folder with a list of scripts to be executed on container start
COPY timescaledb-entrypoint.sh /docker-entrypoint-initdb.d/
FROM timescale/timescaledb:latest-pg14

# Install required packages for building PostGIS and add Perl
RUN apk update && apk add --no-cache \
    build-base \
    cmake \
    wget \
    curl \
    perl \
    clang \
    llvm15 \
    libxml2-dev \
    pcre-dev \
    geos-dev \
    gdal-dev \
    proj-dev \
    protobuf-c-dev \
    sqlite-dev


# Download and build PostGIS
ARG POSTGIS_VERSION="3.3.1"
RUN wget "https://download.osgeo.org/postgis/source/postgis-${POSTGIS_VERSION}.tar.gz" \
    && tar -xzf "postgis-${POSTGIS_VERSION}.tar.gz" \
    && cd "postgis-${POSTGIS_VERSION}" \
    && ./configure --prefix=/usr \
    && make \
    && make install \
    && cd .. \
    && rm -rf postgis-${POSTGIS_VERSION}* \
    # Clean up build dependencies
    && apk del build-base cmake

# The TimescaleDB docker image has a folder with a list of scripts to be executed on container start
COPY timescaledb-entrypoint.sh /docker-entrypoint-initdb.d/

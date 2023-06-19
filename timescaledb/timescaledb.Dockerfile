# Use the timescale/timescaledb:latest-pg14 image as the base
FROM timescale/timescaledb:latest-pg14
# FROM timescale/timescaledb-ha:pg14-oss # <-- This image includes posgGIS but doesn't work on ARM64

# Set environment variables for PostGIS
ENV POSTGIS_VERSION="3.3.3"
# ENV GDAL_VERSION="3.1.2"

# Update the packages and install the necessary dependencies
RUN apk update && apk upgrade \
    && apk add --no-cache --virtual .build-deps \
    autoconf \
    automake \
    g++ \
    json-c-dev \
    libtool \
    libxml2-dev \
    make \
    perl \
    wget \
    curl \
    zlib-dev \
    clang \
    llvm \
    gdal \
    gdal-dev \
    geos \
    geos-dev \
    proj-dev \
    protobuf-c \
    protobuf-c-dev \
    && apk add --no-cache --virtual .run-deps \
    bash \
    su-exec \
    tini \
    libstdc++ \
    libgcc \
    util-linux \
    libc6-compat \
    libcrypto1.1 \
    libssl1.1 \
    libgomp \
    libltdl \
    libuuid \
    openssl \
    krb5-libs \
    libcom_err \
    keyutils-libs \
    libverto \
    libintl \
    libssl1.1 \
    libcrypto1.1 \
    krb5-libs \
    libcom_err \
    keyutils-libs \
    libverto 

# PostGIS is hardcoded to use clang 15 but this image uses clang 16
RUN ln -s $(which clang) /usr/bin/clang-15
RUN mkdir -p /usr/lib/llvm15/bin/ && ln -s /usr/lib/llvm16/bin/llvm-lto /usr/lib/llvm15/bin/llvm-lto

# Download and build PostGIS from source
RUN mkdir -p /usr/src \
    && wget -O postgis.tar.gz "https://download.osgeo.org/postgis/source/postgis-$POSTGIS_VERSION.tar.gz" \
    && tar -xzf postgis.tar.gz -C /usr/src \
    && rm postgis.tar.gz \
    && cd /usr/src/postgis-$POSTGIS_VERSION \
    && ./configure \
    && make \
    && make install

# The TimescaleDB docker image has a folder with a list of scripts to be executed on container start
COPY timescaledb-entrypoint.sh /docker-entrypoint-initdb.d/
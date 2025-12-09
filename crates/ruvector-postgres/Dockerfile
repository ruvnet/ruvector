# Multi-stage Dockerfile for ruvector-postgres extension
# Builds the extension and creates a PostgreSQL image with it installed

# Build stage
# Using nightly Rust to support edition2024 crates in the registry
FROM rustlang/rust:nightly-bookworm-slim AS builder

# Install build dependencies including PostgreSQL 17 from PGDG
RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    pkg-config \
    clang \
    libclang-dev \
    flex \
    bison \
    curl \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Add PostgreSQL official apt repository
RUN curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list

# Install PostgreSQL 17 development packages
RUN apt-get update && apt-get install -y \
    postgresql-server-dev-17 \
    postgresql-17 \
    && rm -rf /var/lib/apt/lists/*

# Install cargo-pgrx
RUN cargo install cargo-pgrx --version 0.12.9 --locked

# Set up workspace
WORKDIR /build

# Create a minimal standalone Cargo.toml for ruvector-postgres
# (not the workspace version)
COPY crates/ruvector-postgres/ ./

# Use the workspace Cargo.lock to pin dependencies and avoid registry parsing issues
COPY Cargo.lock ./

# Initialize pgrx with system PostgreSQL
RUN cargo pgrx init --pg17=/usr/lib/postgresql/17/bin/pg_config

# Pre-fetch dependencies to lock versions and warm the registry cache
RUN cargo fetch

# Configure cargo to avoid sparse registry issues with edition2024 crates
# This uses the git protocol instead of sparse which skips problematic index entries
ENV CARGO_REGISTRIES_CRATES_IO_PROTOCOL=git

# Build the extension with all features including embeddings
RUN cargo pgrx package --features "pg17 index-all quant-all embeddings"

# Copy the pre-built SQL schema file (with sparse functions removed)
# cargo pgrx schema doesn't work reliably in Docker, so we use the hand-crafted file
RUN cp /build/sql/ruvector--0.1.0.sql /build/target/release/ruvector-pg17/usr/share/postgresql/17/extension/ruvector--0.1.0.sql && \
    echo "SQL schema copied with $(grep -c 'CREATE FUNCTION\|CREATE OR REPLACE FUNCTION' /build/target/release/ruvector-pg17/usr/share/postgresql/17/extension/ruvector--0.1.0.sql) functions"

# Verify the extension files are complete
RUN ls -la /build/target/release/ruvector-pg17/usr/share/postgresql/17/extension/ && \
    echo "=== First 20 lines of SQL ===" && \
    head -20 /build/target/release/ruvector-pg17/usr/share/postgresql/17/extension/ruvector--0.1.0.sql && \
    echo "=== CREATE FUNCTION count ===" && \
    grep -c "CREATE FUNCTION\|CREATE OR REPLACE FUNCTION" /build/target/release/ruvector-pg17/usr/share/postgresql/17/extension/ruvector--0.1.0.sql

# Runtime stage
FROM postgres:17-bookworm

# Labels
LABEL maintainer="ruvector team"
LABEL description="PostgreSQL with ruvector extension - high-performance vector similarity search with local embeddings"
LABEL version="0.2.4"

# Copy the built extension from builder
# Note: pgrx generates correct SQL from #[pg_extern] macros in target directory
# The extension/* directory includes:
#   - ruvector.control (version info)
#   - ruvector--*.sql (pgrx-generated SQL with correct function symbols)
#   - Any additional SQL migration files
COPY --from=builder /build/target/release/ruvector-pg17/usr/share/postgresql/17/extension/* \
    /usr/share/postgresql/17/extension/
COPY --from=builder /build/target/release/ruvector-pg17/usr/lib/postgresql/17/lib/* \
    /usr/lib/postgresql/17/lib/

# Add initialization script to create extension
RUN mkdir -p /docker-entrypoint-initdb.d
RUN echo "CREATE EXTENSION IF NOT EXISTS ruvector;" > /docker-entrypoint-initdb.d/01-ruvector.sql

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD pg_isready -U postgres || exit 1

# Expose PostgreSQL port
EXPOSE 5432

# Use the default PostgreSQL entrypoint
CMD ["postgres"]

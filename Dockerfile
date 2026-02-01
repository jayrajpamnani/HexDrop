# =============================================================================
# HexDrop Multi-Stage Dockerfile
# =============================================================================
# This Dockerfile uses multi-stage builds to create an optimized production image
# for the Next.js application with Prisma ORM.

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
# Install all dependencies including devDependencies for building
FROM node:18-alpine AS deps

# Install libc6-compat and OpenSSL for Prisma engine
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package files and prisma schema for dependency installation
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
# --ignore-scripts skips husky which fails in Docker (no git)
RUN npm ci --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
# Build the Next.js application
FROM node:18-alpine AS builder

# Install OpenSSL for Prisma engine during build
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Set environment variables for build (required for module initialization)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV AWS_REGION="us-east-1"
ENV AWS_ACCESS_KEY_ID="placeholder"
ENV AWS_SECRET_ACCESS_KEY="placeholder"
ENV AWS_S3_BUCKET="placeholder"

# Build the Next.js application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Runner (Production)
# -----------------------------------------------------------------------------
# Create the production image with minimal footprint
FROM node:18-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install libc6-compat and OpenSSL for Prisma engine
RUN apk add --no-cache libc6-compat openssl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
# The standalone output includes only the necessary files for production
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files needed for runtime
# Schema uses custom output to src/generated/prisma (not node_modules/.prisma)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Set the port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]

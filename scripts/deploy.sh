#!/bin/bash

# Task Manager API Production Deployment Script
# This script handles the deployment of the API to production environments

set -e  # Exit on any error

# Configuration
APP_NAME="task-manager-api"
DOCKER_IMAGE="${APP_NAME}:latest"
CONTAINER_NAME="${APP_NAME}-prod"
NETWORK_NAME="task-manager-network"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if [ ! -f ".env.production" ]; then
        log_error "Production environment file (.env.production) not found."
        log_info "Please create .env.production with production configuration."
        exit 1
    fi
    
    log_info "Prerequisites check passed."
}

# Build the production Docker image
build_image() {
    log_info "Building production Docker image..."
    
    docker build \
        --build-arg NODE_ENV=production \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        -t ${DOCKER_IMAGE} .
    
    if [ $? -eq 0 ]; then
        log_info "Docker image built successfully."
    else
        log_error "Failed to build Docker image."
        exit 1
    fi
}

# Stop and remove existing container
cleanup_existing() {
    log_info "Cleaning up existing container..."
    
    if docker ps -a --format "table {{.Names}}" | grep -q ${CONTAINER_NAME}; then
        log_info "Stopping existing container..."
        docker stop ${CONTAINER_NAME} || true
        
        log_info "Removing existing container..."
        docker rm ${CONTAINER_NAME} || true
    fi
}

# Create Docker network if it doesn't exist
create_network() {
    log_info "Creating Docker network..."
    
    if ! docker network ls --format "table {{.Name}}" | grep -q ${NETWORK_NAME}; then
        docker network create ${NETWORK_NAME}
        log_info "Docker network created."
    else
        log_info "Docker network already exists."
    fi
}

# Deploy the new container
deploy_container() {
    log_info "Deploying new container..."
    
    docker run -d \
        --name ${CONTAINER_NAME} \
        --network ${NETWORK_NAME} \
        --restart unless-stopped \
        --env-file .env.production \
        -p 3000:3000 \
        --health-cmd="curl -f http://localhost:3000/v1/health || exit 1" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        ${DOCKER_IMAGE}
    
    if [ $? -eq 0 ]; then
        log_info "Container deployed successfully."
    else
        log_error "Failed to deploy container."
        exit 1
    fi
}

# Wait for container to be healthy
wait_for_health() {
    log_info "Waiting for container to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME} | grep -q "healthy"; then
            log_info "Container is healthy!"
            return 0
        fi
        
        log_info "Waiting for container health... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "Container failed to become healthy within expected time."
    log_info "Container logs:"
    docker logs ${CONTAINER_NAME}
    exit 1
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local health_url="http://localhost:3000/v1/health"
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s ${health_url} > /dev/null; then
            log_info "Health check passed!"
            return 0
        fi
        
        log_info "Health check failed... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    log_error "Health checks failed."
    exit 1
}

# Clean up old images
cleanup_images() {
    log_info "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Keep only the last 3 versions
    docker images ${APP_NAME} --format "table {{.Repository}}:{{.Tag}}" | tail -n +4 | \
    while read image; do
        if [ ! -z "$image" ]; then
            log_info "Removing old image: $image"
            docker rmi "$image" || true
        fi
    done
}

# Main deployment function
main() {
    log_info "Starting production deployment..."
    
    check_prerequisites
    build_image
    cleanup_existing
    create_network
    deploy_container
    wait_for_health
    run_health_checks
    cleanup_images
    
    log_info "Deployment completed successfully!"
    log_info "API is available at: http://localhost:3000"
    log_info "Health check: http://localhost:3000/v1/health"
    log_info "API docs: http://localhost:3000/v1/docs"
}

# Rollback function
rollback() {
    log_warn "Rolling back deployment..."
    
    if docker ps -a --format "table {{.Names}}" | grep -q ${CONTAINER_NAME}-backup; then
        log_info "Stopping current container..."
        docker stop ${CONTAINER_NAME} || true
        docker rm ${CONTAINER_NAME} || true
        
        log_info "Restoring backup container..."
        docker rename ${CONTAINER_NAME}-backup ${CONTAINER_NAME}
        docker start ${CONTAINER_NAME}
        
        log_info "Rollback completed."
    else
        log_error "No backup container found for rollback."
        exit 1
    fi
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        run_health_checks
        ;;
    "logs")
        docker logs -f ${CONTAINER_NAME}
        ;;
    "status")
        docker ps --filter "name=${CONTAINER_NAME}"
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|logs|status}"
        echo "  deploy   - Deploy the application (default)"
        echo "  rollback - Rollback to previous version"
        echo "  health   - Run health checks"
        echo "  logs     - Show container logs"
        echo "  status   - Show container status"
        exit 1
        ;;
esac

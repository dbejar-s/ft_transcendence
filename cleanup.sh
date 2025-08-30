#!/bin/bash

# Docker Cleanup Script for ft_transcendence
# This script helps maintain disk space by cleaning up Docker artifacts

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running or not accessible"
        exit 1
    fi
}

# Function to show disk usage before cleanup
show_disk_usage() {
    print_info "Current Docker disk usage:"
    docker system df
    echo
}

# Function to perform safe cleanup
safe_cleanup() {
    print_info "Performing safe cleanup (keeps running containers and recent images)..."

    # Stop all containers (but don't remove them yet)
    print_info "Stopping all containers..."
    docker stop $(docker ps -aq) 2>/dev/null || true

    # Remove stopped containers
    print_info "Removing stopped containers..."
    docker container prune -f

    # Remove unused networks
    print_info "Removing unused networks..."
    docker network prune -f

    # Remove dangling images (images not tagged and not used by any container)
    print_info "Removing dangling images..."
    docker image prune -f

    # Remove build cache
    print_info "Removing build cache..."
    docker builder prune -f

    print_success "Safe cleanup completed!"
}

# Function to perform aggressive cleanup
aggressive_cleanup() {
    print_warning "Performing aggressive cleanup (removes more, including unused images)..."
    read -p "This will remove all unused images. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aggressive cleanup cancelled."
        return
    fi

    # Remove all unused images (not just dangling ones)
    print_info "Removing all unused images..."
    docker image prune -a -f

    # Remove unused volumes
    print_info "Removing unused volumes..."
    docker volume prune -f

    print_success "Aggressive cleanup completed!"
}

# Function to perform complete cleanup
complete_cleanup() {
    print_warning "Performing COMPLETE cleanup (removes everything not currently running)..."
    read -p "This will remove ALL unused containers, images, networks, and volumes. Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Complete cleanup cancelled."
        return
    fi

    print_info "Removing all unused containers, networks, and images..."
    docker system prune -a -f

    print_info "Removing unused volumes..."
    docker volume prune -f

    print_success "Complete cleanup completed!"
}

# Function to show cleanup options
show_menu() {
    echo "========================================"
    echo "  Docker Cleanup Script for ft_transcendence"
    echo "========================================"
    echo
    echo "Choose cleanup level:"
    echo "1) Safe cleanup (recommended)"
    echo "   - Removes stopped containers"
    echo "   - Removes unused networks"
    echo "   - Removes dangling images"
    echo "   - Removes build cache"
    echo
    echo "2) Aggressive cleanup"
    echo "   - All of safe cleanup"
    echo "   - Removes all unused images"
    echo "   - Removes unused volumes"
    echo
    echo "3) Complete cleanup (nuclear option)"
    echo "   - Removes EVERYTHING not currently running"
    echo "   - Use with caution!"
    echo
    echo "4) Show current disk usage"
    echo "5) Exit"
    echo
    read -p "Enter your choice (1-5): " choice
}

# Function to clean Node.js artifacts
clean_node_artifacts() {
    print_info "Cleaning Node.js artifacts..."

    # Clean npm cache
    if command -v npm >/dev/null 2>&1; then
        print_info "Cleaning npm cache..."
        npm cache clean --force 2>/dev/null || true
    fi

    # Clean yarn cache
    if command -v yarn >/dev/null 2>&1; then
        print_info "Cleaning yarn cache..."
        yarn cache clean 2>/dev/null || true
    fi

    # Remove node_modules and reinstall (optional)
    read -p "Remove and reinstall node_modules? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Removing node_modules..."
        rm -rf node_modules frontend/node_modules backend/node_modules 2>/dev/null || true

        print_info "Reinstalling dependencies..."
        if [ -f "package.json" ]; then
            npm install
        fi
        if [ -f "frontend/package.json" ]; then
            cd frontend && npm install && cd ..
        fi
        if [ -f "backend/package.json" ]; then
            cd backend && npm install && cd ..
        fi
    fi

    print_success "Node.js cleanup completed!"
}

# Main script
main() {
    print_info "Starting Docker cleanup script..."

    # Check if Docker is available
    check_docker

    # Show initial disk usage
    show_disk_usage

    # Main menu loop
    while true; do
        show_menu

        case $choice in
            1)
                safe_cleanup
                show_disk_usage
                ;;
            2)
                aggressive_cleanup
                show_disk_usage
                ;;
            3)
                complete_cleanup
                show_disk_usage
                ;;
            4)
                show_disk_usage
                ;;
            5)
                print_info "Exiting cleanup script."
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please select 1-5."
                continue
                ;;
        esac

        echo
        read -p "Perform another cleanup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            break
        fi
    done

    # Ask about Node.js cleanup
    echo
    read -p "Also clean Node.js artifacts? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        clean_node_artifacts
    fi

    print_success "Cleanup script completed!"
    print_info "Don't forget to rebuild your containers after cleanup if needed."
}

# Run main function
main "$@"

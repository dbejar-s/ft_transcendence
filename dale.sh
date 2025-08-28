#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Dale, don, dale..."

docker-compose down --volumes --remove-orphans

echo "BUILD and UP..."

docker-compose up --build
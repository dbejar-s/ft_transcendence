# Docker Cleanup Aliases for ft_transcendence
# Add these to your ~/.bashrc or ~/.zshrc for easy access

# Quick cleanup (safe level)
alias docker-clean='cd /path/to/ft_transcendence && ./cleanup.sh'

# Direct safe cleanup (no menu)
alias docker-clean-safe='docker system prune -f && docker image prune -f && docker builder prune -f'

# Direct aggressive cleanup
alias docker-clean-aggressive='docker-clean-safe && docker image prune -a -f && docker volume prune -f'

# Show Docker disk usage
alias docker-usage='docker system df'

# Show Docker images
alias docker-images='docker images'

# Show running containers
alias docker-ps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'

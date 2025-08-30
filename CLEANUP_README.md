# Docker Cleanup Script

This script helps maintain disk space by cleaning up Docker artifacts that accumulate during development.

## Usage

```bash
# Make script executable (already done)
chmod +x cleanup.sh

# Run the cleanup script
./cleanup.sh
```

## Cleanup Options

The script provides three levels of cleanup:

### 1. Safe Cleanup (Recommended)
- Removes stopped containers
- Removes unused networks
- Removes dangling images (untagged images)
- Removes build cache
- **Safe for daily use**

### 2. Aggressive Cleanup
- All of safe cleanup
- Removes all unused images (not just dangling)
- Removes unused volumes
- **Use when you need more space**

### 3. Complete Cleanup (Nuclear Option)
- Removes EVERYTHING not currently running
- Containers, images, networks, volumes
- **Use with extreme caution!**

## What Gets Cleaned

### Docker Artifacts
- Stopped containers
- Unused networks
- Dangling images (intermediate build layers)
- Build cache
- Unused images (aggressive mode)
- Unused volumes (aggressive mode)

### Node.js Artifacts (Optional)
- npm/yarn cache
- node_modules (with reinstall option)

## When to Run

- **Daily/Weekly**: Safe cleanup
- **When low on disk space**: Aggressive cleanup
- **Before major rebuilds**: Complete cleanup
- **After many builds**: Any cleanup level

## Safety Notes

- The script shows current disk usage before and after cleanup
- Safe cleanup preserves your current working images
- Always check what will be removed before confirming
- After complete cleanup, you'll need to rebuild your containers

## Example Output

```
=======================================
  Docker Cleanup Script for ft_transcendence
=======================================

Choose cleanup level:
1) Safe cleanup (recommended)
2) Aggressive cleanup
3) Complete cleanup (nuclear option)
4) Show current disk usage
5) Exit

Enter your choice (1-5): 1
[INFO] Performing safe cleanup...
[SUCCESS] Safe cleanup completed!
```

## Automated Usage

You can also run specific cleanup levels directly:

```bash
# Safe cleanup only
echo "1" | ./cleanup.sh

# With Node.js cleanup
echo -e "1\ny" | ./cleanup.sh
```

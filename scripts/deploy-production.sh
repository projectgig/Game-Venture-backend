#!/bin/bash
set -e

# Production Blue-Green Deployment Script for Docker Swarm
# Zero-downtime deployment using separate blue/green stacks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BLUE_STACK="venture-prod-blue"
GREEN_STACK="venture-prod-green"
STACK_FILE="${STACK_FILE:-/root/venture/swarm/production/stack.yml}"
ENV_FILE="${ENV_FILE:-/root/venture/.env.production}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DOCKER_IMAGE="${DOCKER_IMAGE:-gigproject/venture-api}"
DESIRED_REPLICAS=3
MAX_HEALTH_ATTEMPTS=40
HEALTH_ENDPOINT="http://localhost:8000/api/health"

echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}Production Blue-Green Deployment${NC}"
echo -e "${GREEN}=================================${NC}"

# Initialize Swarm if needed
if ! docker info | grep -q "Swarm: active"; then
  echo -e "${YELLOW}Initializing Docker Swarm...${NC}"
  docker swarm init || true
fi

# Determine current and new stack
if docker stack ls | grep -q "$BLUE_STACK"; then
  CURRENT_STACK="$BLUE_STACK"
  NEW_STACK="$GREEN_STACK"
  NEW_COLOR="GREEN"
  OLD_COLOR="BLUE"
  echo -e "${BLUE}Current active: BLUE${NC}"
  echo -e "${GREEN}Deploying to: GREEN${NC}"
else
  CURRENT_STACK="$GREEN_STACK"
  NEW_STACK="$BLUE_STACK"
  NEW_COLOR="BLUE"
  OLD_COLOR="GREEN"
  echo -e "${GREEN}Current active: GREEN${NC}"
  echo -e "${BLUE}Deploying to: BLUE${NC}"
fi

# Pull latest image
echo -e "${YELLOW}Pulling image: ${DOCKER_IMAGE}:${IMAGE_TAG}${NC}"
docker pull ${DOCKER_IMAGE}:${IMAGE_TAG}

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
if [ -f "$ENV_FILE" ]; then
  source $ENV_FILE
  
  # Create shared network for migrations (if needed)
  docker network create --driver overlay --attachable venture-prod-shared 2>/dev/null || true
  
  docker run --rm \
    --network venture-prod-shared \
    -e DATABASE_URL="$DATABASE_URL" \
    ${DOCKER_IMAGE}:${IMAGE_TAG} \
    npx prisma migrate deploy || echo -e "${YELLOW}Warning: Migrations failed or not needed${NC}"
else
  echo -e "${RED}Error: ENV file not found at $ENV_FILE${NC}"
  exit 1
fi

# Deploy new stack
echo -e "${YELLOW}Deploying ${NEW_COLOR} stack: ${NEW_STACK}${NC}"
export DOCKER_IMAGE=$DOCKER_IMAGE
export IMAGE_TAG=$IMAGE_TAG
source $ENV_FILE

docker stack deploy \
  -c $STACK_FILE \
  --with-registry-auth \
  --prune \
  $NEW_STACK

# Wait for services to initialize
echo -e "${YELLOW}Waiting for ${NEW_COLOR} stack to start...${NC}"
sleep 30

# Verify new stack health
echo -e "${YELLOW}Verifying ${NEW_COLOR} stack health...${NC}"
SERVICE_NAME="${NEW_STACK}_app"

attempt=1
health_success=0

while [ $attempt -le $MAX_HEALTH_ATTEMPTS ]; do
  # Check replicas
  REPLICAS=$(docker service ls --filter name=$SERVICE_NAME --format "{{.Replicas}}" 2>/dev/null || echo "0/0")
  RUNNING=$(echo $REPLICAS | cut -d'/' -f1)
  TOTAL=$(echo $REPLICAS | cut -d'/' -f2)
  
  echo "Attempt $attempt/$MAX_HEALTH_ATTEMPTS: ${NEW_COLOR} Replicas $RUNNING/$TOTAL"
  
  # Check if all replicas are running
  if [ "$RUNNING" = "$DESIRED_REPLICAS" ] && [ "$TOTAL" = "$DESIRED_REPLICAS" ]; then
    # Perform health check
    if curl -f -s "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
      health_success=$((health_success + 1))
      echo -e "${GREEN}✓ Health check passed ($health_success/3)${NC}"
      
      if [ $health_success -ge 3 ]; then
        echo -e "${GREEN}${NEW_COLOR} stack is healthy!${NC}"
        break
      fi
    else
      health_success=0
      echo -e "${YELLOW}Health check failed, retrying...${NC}"
    fi
  else
    health_success=0
  fi
  
  sleep 10
  attempt=$((attempt + 1))
done

# Check if deployment was successful
if [ $health_success -lt 3 ]; then
  echo -e "${RED}=================================${NC}"
  echo -e "${RED}✗ ${NEW_COLOR} stack health check FAILED!${NC}"
  echo -e "${RED}=================================${NC}"
  
  echo -e "\n${YELLOW}Service status:${NC}"
  docker service ps $SERVICE_NAME --no-trunc
  
  echo -e "\n${YELLOW}Service logs:${NC}"
  docker service logs $SERVICE_NAME --tail 50
  
  echo -e "${RED}Rolling back ${NEW_COLOR} stack...${NC}"
  docker stack rm $NEW_STACK
  
  exit 1
fi

# Cutover - New stack is live
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}✓ ${NEW_COLOR} stack is LIVE!${NC}"
echo -e "${GREEN}=================================${NC}"

# Wait for stability
echo -e "${YELLOW}Monitoring ${NEW_COLOR} stack for 15 seconds...${NC}"
sleep 15

# Final verification
if curl -f -s "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Final health check passed${NC}"
else
  echo -e "${RED}Warning: Final health check failed${NC}"
  echo -e "${YELLOW}Keeping both stacks running for manual inspection${NC}"
  exit 1
fi

# Remove old stack
if docker stack ls | grep -q "$CURRENT_STACK"; then
  echo -e "${YELLOW}Removing ${OLD_COLOR} stack: ${CURRENT_STACK}${NC}"
  docker stack rm $CURRENT_STACK
  
  # Wait for stack removal
  echo -e "${YELLOW}Waiting for ${OLD_COLOR} stack cleanup...${NC}"
  sleep 10
fi

# Cleanup old images (optional)
echo -e "${YELLOW}Cleaning up old images...${NC}"
docker image prune -f || true

# Show final status
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}✓ Production Deployment SUCCESSFUL!${NC}"
echo -e "${GREEN}Active Stack: ${NEW_COLOR} (${NEW_STACK})${NC}"
echo -e "${GREEN}=================================${NC}"

# Show service info
echo -e "\n${YELLOW}Running services:${NC}"
docker stack services $NEW_STACK

echo -e "\n${YELLOW}Service replicas:${NC}"
docker service ps ${SERVICE_NAME} --filter "desired-state=running"

exit 0
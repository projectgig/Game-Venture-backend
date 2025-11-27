#!/bin/bash
set -e

# Staging Deployment Script for Docker Swarm
# Uses rolling updates for zero-downtime deployment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="${STACK_NAME:-venture-staging}"
STACK_FILE="${STACK_FILE:-/root/venture/swarm/staging/stack.yml}"
ENV_FILE="${ENV_FILE:-/root/venture/.env.staging}"
IMAGE_TAG="${IMAGE_TAG:-dev-latest}"
DOCKER_IMAGE="${DOCKER_IMAGE:-gigproject/venture-api}"
DESIRED_REPLICAS=2
MAX_HEALTH_ATTEMPTS=30
HEALTH_ENDPOINT="http://localhost:5000/api/health"

echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}Staging Deployment Started${NC}"
echo -e "${GREEN}=================================${NC}"

# Initialize Swarm if needed
if ! docker info | grep -q "Swarm: active"; then
  echo -e "${YELLOW}Initializing Docker Swarm...${NC}"
  docker swarm init || true
fi

# Pull latest image
echo -e "${YELLOW}Pulling image: ${DOCKER_IMAGE}:${IMAGE_TAG}${NC}"
docker pull ${DOCKER_IMAGE}:${IMAGE_TAG}

# Check if stack exists
STACK_EXISTS=$(docker stack ls | grep -w "$STACK_NAME" || true)

if [ -z "$STACK_EXISTS" ]; then
  echo -e "${YELLOW}Stack doesn't exist. Creating new stack...${NC}"
  FIRST_DEPLOY=true
else
  echo -e "${YELLOW}Stack exists. Performing rolling update...${NC}"
  FIRST_DEPLOY=false
fi

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
if [ -f "$ENV_FILE" ]; then
  source $ENV_FILE
  
  # Create network if doesn't exist (for migrations)
  docker network create --driver overlay --attachable ${STACK_NAME}_backend 2>/dev/null || true
  
  docker run --rm \
    --network ${STACK_NAME}_backend \
    -e DATABASE_URL="$DATABASE_URL" \
    ${DOCKER_IMAGE}:${IMAGE_TAG} \
    npx prisma migrate deploy || echo -e "${YELLOW}Warning: Migrations failed or not needed${NC}"
else
  echo -e "${RED}Warning: ENV file not found at $ENV_FILE${NC}"
fi

# Deploy stack
echo -e "${YELLOW}Deploying stack: ${STACK_NAME}${NC}"
export DOCKER_IMAGE=$DOCKER_IMAGE
export IMAGE_TAG=$IMAGE_TAG
source $ENV_FILE

docker stack deploy \
  -c $STACK_FILE \
  --with-registry-auth \
  --prune \
  $STACK_NAME

# Wait for services to initialize
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 20

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
SERVICE_NAME="${STACK_NAME}_app"

attempt=1
health_success=0

while [ $attempt -le $MAX_HEALTH_ATTEMPTS ]; do
  # Check replicas
  REPLICAS=$(docker service ls --filter name=$SERVICE_NAME --format "{{.Replicas}}" 2>/dev/null || echo "0/0")
  RUNNING=$(echo $REPLICAS | cut -d'/' -f1)
  TOTAL=$(echo $REPLICAS | cut -d'/' -f2)
  
  echo "Attempt $attempt/$MAX_HEALTH_ATTEMPTS: Replicas $RUNNING/$TOTAL"
  
  # Check if all replicas are running
  if [ "$RUNNING" = "$DESIRED_REPLICAS" ] && [ "$TOTAL" = "$DESIRED_REPLICAS" ]; then
    # Perform health check
    if curl -f -s "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
      health_success=$((health_success + 1))
      echo -e "${GREEN}✓ Health check passed ($health_success/3)${NC}"
      
      if [ $health_success -ge 3 ]; then
        echo -e "${GREEN}=================================${NC}"
        echo -e "${GREEN}✓ Deployment SUCCESSFUL!${NC}"
        echo -e "${GREEN}=================================${NC}"
        
        # Show service info
        docker service ps $SERVICE_NAME --no-trunc --filter "desired-state=running"
        
        # Show service logs (last 20 lines)
        echo -e "\n${YELLOW}Recent logs:${NC}"
        docker service logs $SERVICE_NAME --tail 20
        
        exit 0
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

# Deployment failed
echo -e "${RED}=================================${NC}"
echo -e "${RED}✗ Deployment FAILED!${NC}"
echo -e "${RED}=================================${NC}"

# Show service details for debugging
echo -e "\n${YELLOW}Service status:${NC}"
docker service ps $SERVICE_NAME --no-trunc

echo -e "\n${YELLOW}Service logs (last 50 lines):${NC}"
docker service logs $SERVICE_NAME --tail 50

echo -e "\n${YELLOW}Stack services:${NC}"
docker stack services $STACK_NAME

exit 1
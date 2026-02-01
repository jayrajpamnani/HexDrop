#!/bin/bash
# =============================================================================
# HexDrop AWS Infrastructure Setup Script
# =============================================================================
# This script sets up the required AWS infrastructure for HexDrop deployment.
# 
# Prerequisites:
# - AWS CLI installed and configured with appropriate credentials
# - eksctl installed (https://eksctl.io/)
# - kubectl installed
# - helm installed
#
# Usage:
#   chmod +x scripts/aws-setup.sh
#   ./scripts/aws-setup.sh
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration - MODIFY THESE VALUES
# -----------------------------------------------------------------------------
export AWS_REGION="us-east-1"                    # Your AWS region
export CLUSTER_NAME="hexdrop-cluster"            # EKS cluster name
export ECR_REPO_NAME="hexdrop"                   # ECR repository name
export RDS_INSTANCE_NAME="hexdrop-db"            # RDS instance identifier
export RDS_DB_NAME="hexdrop"                     # Database name
export RDS_USERNAME="hexdrop_admin"              # Database username
export SECRET_NAME="hexdrop/production"          # AWS Secrets Manager secret name
export S3_BUCKET_NAME="hexdrop-files-$(date +%s)" # S3 bucket (must be globally unique)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HexDrop AWS Infrastructure Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Create ECR Repository
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 1: Creating ECR Repository...${NC}"

aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    2>/dev/null || echo "ECR repository may already exist"

ECR_URI=$(aws ecr describe-repositories \
    --repository-names $ECR_REPO_NAME \
    --region $AWS_REGION \
    --query 'repositories[0].repositoryUri' \
    --output text)

echo -e "${GREEN}ECR Repository URI: $ECR_URI${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 2: Create EKS Cluster
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 2: Creating EKS Cluster...${NC}"
echo "This may take 15-20 minutes..."

eksctl create cluster \
    --name $CLUSTER_NAME \
    --region $AWS_REGION \
    --version 1.29 \
    --nodegroup-name hexdrop-nodes \
    --node-type t3.medium \
    --nodes 2 \
    --nodes-min 1 \
    --nodes-max 4 \
    --managed \
    --with-oidc \
    --full-ecr-access \
    2>/dev/null || echo "Cluster may already exist or is being created"

# Update kubeconfig
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION

echo -e "${GREEN}EKS Cluster created and configured${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 3: Install AWS Load Balancer Controller
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 3: Installing AWS Load Balancer Controller...${NC}"

# Create IAM policy for ALB controller
curl -o /tmp/iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file:///tmp/iam-policy.json \
    2>/dev/null || echo "Policy may already exist"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create service account for ALB controller
eksctl create iamserviceaccount \
    --cluster=$CLUSTER_NAME \
    --namespace=kube-system \
    --name=aws-load-balancer-controller \
    --attach-policy-arn=arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy \
    --override-existing-serviceaccounts \
    --approve \
    --region $AWS_REGION \
    2>/dev/null || echo "Service account may already exist"

# Install ALB controller using Helm
helm repo add eks https://aws.github.io/eks-charts 2>/dev/null || true
helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
    -n kube-system \
    --set clusterName=$CLUSTER_NAME \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller

echo -e "${GREEN}AWS Load Balancer Controller installed${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 4: Create RDS PostgreSQL Instance
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 4: Creating RDS PostgreSQL Instance...${NC}"

# Generate a random password
RDS_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
echo "Generated RDS password (save this!): $RDS_PASSWORD"

# Get VPC ID from EKS cluster
echo "Getting VPC ID from EKS cluster..."
VPC_ID=$(aws eks describe-cluster \
    --name $CLUSTER_NAME \
    --query 'cluster.resourcesVpcConfig.vpcId' \
    --output text \
    --region $AWS_REGION)

if [ -z "$VPC_ID" ] || [ "$VPC_ID" == "None" ]; then
    echo -e "${RED}ERROR: Could not get VPC ID. Make sure EKS cluster exists.${NC}"
    exit 1
fi
echo "VPC ID: $VPC_ID"

# Get private subnet IDs (subnets without public IP auto-assign)
echo "Getting subnet IDs..."
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[*].SubnetId' \
    --output text \
    --region $AWS_REGION)
echo "Subnet IDs: $SUBNET_IDS"

# Create DB subnet group
echo "Creating DB subnet group..."
aws rds create-db-subnet-group \
    --db-subnet-group-name hexdrop-db-subnet-group \
    --db-subnet-group-description "Subnet group for HexDrop RDS" \
    --subnet-ids $SUBNET_IDS \
    --region $AWS_REGION \
    2>/dev/null && echo "DB subnet group created" || echo "DB subnet group may already exist"

# Create a security group for RDS
echo "Creating security group for RDS..."
RDS_SG=$(aws ec2 create-security-group \
    --group-name hexdrop-rds-sg \
    --description "Security group for HexDrop RDS" \
    --vpc-id $VPC_ID \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text 2>/dev/null) || \
RDS_SG=$(aws ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=hexdrop-rds-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $AWS_REGION)

if [ -z "$RDS_SG" ] || [ "$RDS_SG" == "None" ]; then
    echo -e "${RED}ERROR: Could not create or find RDS security group.${NC}"
    exit 1
fi
echo "RDS Security Group ID: $RDS_SG"

# Add inbound rule to allow PostgreSQL from VPC CIDR
VPC_CIDR=$(aws ec2 describe-vpcs \
    --vpc-ids $VPC_ID \
    --query 'Vpcs[0].CidrBlock' \
    --output text \
    --region $AWS_REGION)

echo "Adding inbound rule for PostgreSQL (port 5432) from VPC CIDR: $VPC_CIDR"
aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG \
    --protocol tcp \
    --port 5432 \
    --cidr $VPC_CIDR \
    --region $AWS_REGION \
    2>/dev/null || echo "Ingress rule may already exist"

# Check if RDS instance already exists
echo "Checking if RDS instance already exists..."
EXISTING_RDS=$(aws rds describe-db-instances \
    --db-instance-identifier $RDS_INSTANCE_NAME \
    --region $AWS_REGION \
    --query 'DBInstances[0].DBInstanceIdentifier' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$EXISTING_RDS" == "$RDS_INSTANCE_NAME" ]; then
    echo "RDS instance already exists, skipping creation..."
else
    # Create RDS instance
    echo "Creating RDS PostgreSQL instance (this may take 5-10 minutes)..."
    if ! aws rds create-db-instance \
        --db-instance-identifier $RDS_INSTANCE_NAME \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 15 \
        --master-username $RDS_USERNAME \
        --master-user-password $RDS_PASSWORD \
        --allocated-storage 20 \
        --storage-type gp2 \
        --db-name $RDS_DB_NAME \
        --vpc-security-group-ids $RDS_SG \
        --db-subnet-group-name hexdrop-db-subnet-group \
        --backup-retention-period 7 \
        --no-publicly-accessible \
        --region $AWS_REGION; then
        echo -e "${RED}ERROR: Failed to create RDS instance. Check AWS console for details.${NC}"
        exit 1
    fi
    echo "RDS instance creation initiated..."
fi

echo "Waiting for RDS instance to be available..."
aws rds wait db-instance-available --db-instance-identifier $RDS_INSTANCE_NAME --region $AWS_REGION

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier $RDS_INSTANCE_NAME \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $AWS_REGION)

DATABASE_URL="postgresql://${RDS_USERNAME}:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/${RDS_DB_NAME}"

echo -e "${GREEN}RDS PostgreSQL created${NC}"
echo -e "${GREEN}RDS Endpoint: $RDS_ENDPOINT${NC}"
echo -e "${GREEN}DATABASE_URL: $DATABASE_URL${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 5: Create S3 Bucket (if needed)
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 5: Creating S3 Bucket...${NC}"

# Check if bucket already exists
if aws s3api head-bucket --bucket $S3_BUCKET_NAME 2>/dev/null; then
    echo "S3 bucket $S3_BUCKET_NAME already exists"
else
    echo "Creating S3 bucket: $S3_BUCKET_NAME"
    # us-east-1 doesn't need LocationConstraint, other regions do
    if [ "$AWS_REGION" == "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket $S3_BUCKET_NAME \
            --region $AWS_REGION
    else
        aws s3api create-bucket \
            --bucket $S3_BUCKET_NAME \
            --region $AWS_REGION \
            --create-bucket-configuration LocationConstraint=$AWS_REGION
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to create S3 bucket. The name might be taken globally.${NC}"
        echo "Trying with a more unique name..."
        S3_BUCKET_NAME="hexdrop-files-${AWS_ACCOUNT_ID}-$(date +%s)"
        
        if [ "$AWS_REGION" == "us-east-1" ]; then
            aws s3api create-bucket \
                --bucket $S3_BUCKET_NAME \
                --region $AWS_REGION
        else
            aws s3api create-bucket \
                --bucket $S3_BUCKET_NAME \
                --region $AWS_REGION \
                --create-bucket-configuration LocationConstraint=$AWS_REGION
        fi
    fi
fi

# Enable versioning
echo "Enabling versioning on S3 bucket..."
aws s3api put-bucket-versioning \
    --bucket $S3_BUCKET_NAME \
    --versioning-configuration Status=Enabled \
    --region $AWS_REGION

echo -e "${GREEN}S3 Bucket created: $S3_BUCKET_NAME${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 6: Store Secrets in AWS Secrets Manager
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 6: Storing secrets in AWS Secrets Manager...${NC}"

# Create secret JSON
SECRET_JSON=$(cat <<EOF
{
    "DATABASE_URL": "$DATABASE_URL",
    "AWS_ACCESS_KEY_ID": "YOUR_ACCESS_KEY_HERE",
    "AWS_SECRET_ACCESS_KEY": "YOUR_SECRET_KEY_HERE",
    "AWS_REGION": "$AWS_REGION",
    "AWS_S3_BUCKET": "$S3_BUCKET_NAME"
}
EOF
)

aws secretsmanager create-secret \
    --name $SECRET_NAME \
    --description "HexDrop production secrets" \
    --secret-string "$SECRET_JSON" \
    --region $AWS_REGION \
    2>/dev/null || aws secretsmanager update-secret \
        --secret-id $SECRET_NAME \
        --secret-string "$SECRET_JSON" \
        --region $AWS_REGION

echo -e "${GREEN}Secrets stored in AWS Secrets Manager${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 7: Install External Secrets Operator
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 7: Installing External Secrets Operator...${NC}"

helm repo add external-secrets https://charts.external-secrets.io 2>/dev/null || true
helm repo update

helm upgrade --install external-secrets external-secrets/external-secrets \
    -n external-secrets \
    --create-namespace \
    --wait

echo -e "${GREEN}External Secrets Operator installed${NC}"
echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Important values to save:"
echo "========================="
echo -e "ECR Repository URI: ${GREEN}$ECR_URI${NC}"
echo -e "EKS Cluster Name: ${GREEN}$CLUSTER_NAME${NC}"
echo -e "RDS Endpoint: ${GREEN}$RDS_ENDPOINT${NC}"
echo -e "S3 Bucket: ${GREEN}$S3_BUCKET_NAME${NC}"
echo -e "Secret Name: ${GREEN}$SECRET_NAME${NC}"
echo ""
echo "GitHub Secrets to configure:"
echo "============================"
echo "AWS_ACCESS_KEY_ID: <your-aws-access-key>"
echo "AWS_SECRET_ACCESS_KEY: <your-aws-secret-key>"
echo "AWS_REGION: $AWS_REGION"
echo "ECR_REPOSITORY: $ECR_REPO_NAME"
echo "EKS_CLUSTER_NAME: $CLUSTER_NAME"
echo ""
echo -e "${YELLOW}IMPORTANT: Update the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY${NC}"
echo -e "${YELLOW}in AWS Secrets Manager with your actual S3 access credentials.${NC}"
echo ""
echo -e "${GREEN}You can now push to your main branch to trigger the CI/CD pipeline!${NC}"

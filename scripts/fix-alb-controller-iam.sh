#!/bin/bash
# =============================================================================
# Fix AWS Load Balancer Controller IAM Permissions
# =============================================================================
# The ALB controller needs full IAM permissions to create Load Balancers.
# Run this script to attach the correct policy to the controller's role.
#
# Usage: ./scripts/fix-alb-controller-iam.sh
# =============================================================================

set -e

AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-hexdrop-cluster}"
POLICY_NAME="AWSLoadBalancerControllerIAMPolicy"

echo "Fixing ALB Controller IAM permissions..."

# Download the official IAM policy
echo "Downloading IAM policy..."
curl -sS -o /tmp/iam_policy.json \
  "https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json"

# Get the IAM role used by the ALB controller (from the service account)
ROLE_ARN=$(kubectl get sa aws-load-balancer-controller -n kube-system \
  -o jsonpath='{.metadata.annotations.eks\.amazonaws\.com/role-arn}' 2>/dev/null)

if [ -z "$ROLE_ARN" ]; then
  echo "Could not find ALB controller service account. Trying EKS addon role..."
  # For EKS addon, the role might be different - get from the pod
  ROLE_ARN=$(kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller \
    -o jsonpath='{.items[0].spec.serviceAccountName}' 2>/dev/null | xargs -I {} kubectl get sa {} -n kube-system -o jsonpath='{.metadata.annotations.eks\.amazonaws\.com/role-arn}' 2>/dev/null)
fi

if [ -z "$ROLE_ARN" ]; then
  echo "ERROR: Could not find ALB controller IAM role."
  echo "Make sure the controller is installed and using IRSA."
  exit 1
fi

ROLE_NAME=$(echo "$ROLE_ARN" | awk -F'/' '{print $NF}')
echo "Found role: $ROLE_NAME"

# Create or update the policy
echo "Creating/updating IAM policy..."
aws iam create-policy \
  --policy-name $POLICY_NAME \
  --policy-document file:///tmp/iam_policy.json \
  2>/dev/null || aws iam create-policy-version \
    --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$POLICY_NAME" \
    --policy-document file:///tmp/iam_policy.json \
    --set-as-default \
  2>/dev/null || echo "Policy already exists, attaching..."

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}"

# Attach policy to the role
echo "Attaching policy to role..."
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "$POLICY_ARN"

echo ""
echo "SUCCESS! IAM policy attached to $ROLE_NAME"
echo ""
echo "The ALB controller will retry creating the Load Balancer."
echo "Wait 2-5 minutes, then run:"
echo "  kubectl get ingress hexdrop -n hexdrop"
echo ""
echo "Once ADDRESS is populated, your site will be at: http://<ADDRESS>"

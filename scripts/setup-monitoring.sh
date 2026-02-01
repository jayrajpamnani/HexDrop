#!/bin/bash
# =============================================================================
# HexDrop CloudWatch Container Insights Setup
# =============================================================================
# This script sets up monitoring for the EKS cluster using CloudWatch Container
# Insights and creates CloudWatch alarms for critical metrics.
#
# Prerequisites:
# - EKS cluster is running
# - kubectl is configured for the cluster
# - AWS CLI is installed and configured
#
# Usage:
#   chmod +x scripts/setup-monitoring.sh
#   ./scripts/setup-monitoring.sh
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
export AWS_REGION="${AWS_REGION:-us-east-1}"
export CLUSTER_NAME="${CLUSTER_NAME:-hexdrop-cluster}"
export SNS_TOPIC_NAME="hexdrop-alerts"
export ALERT_EMAIL="${ALERT_EMAIL:-your-email@example.com}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HexDrop Monitoring Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Enable CloudWatch Container Insights
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 1: Enabling CloudWatch Container Insights...${NC}"

# Create namespace for CloudWatch
kubectl create namespace amazon-cloudwatch 2>/dev/null || echo "Namespace already exists"

# Create service account for CloudWatch agent
eksctl create iamserviceaccount \
    --name cloudwatch-agent \
    --namespace amazon-cloudwatch \
    --cluster $CLUSTER_NAME \
    --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
    --override-existing-serviceaccounts \
    --approve \
    --region $AWS_REGION \
    2>/dev/null || echo "Service account may already exist"

# Create service account for Fluent Bit
eksctl create iamserviceaccount \
    --name fluent-bit \
    --namespace amazon-cloudwatch \
    --cluster $CLUSTER_NAME \
    --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
    --override-existing-serviceaccounts \
    --approve \
    --region $AWS_REGION \
    2>/dev/null || echo "Service account may already exist"

# Install CloudWatch Observability add-on
aws eks create-addon \
    --cluster-name $CLUSTER_NAME \
    --addon-name amazon-cloudwatch-observability \
    --region $AWS_REGION \
    2>/dev/null || echo "Add-on may already exist"

echo -e "${GREEN}CloudWatch Container Insights enabled${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 2: Enable EKS Control Plane Logging
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 2: Enabling EKS Control Plane Logging...${NC}"

aws eks update-cluster-config \
    --name $CLUSTER_NAME \
    --region $AWS_REGION \
    --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}'

echo -e "${GREEN}EKS Control Plane Logging enabled${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 3: Create SNS Topic for Alerts
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 3: Creating SNS Topic for Alerts...${NC}"

SNS_TOPIC_ARN=$(aws sns create-topic \
    --name $SNS_TOPIC_NAME \
    --region $AWS_REGION \
    --query 'TopicArn' \
    --output text)

# Subscribe email to topic
aws sns subscribe \
    --topic-arn $SNS_TOPIC_ARN \
    --protocol email \
    --notification-endpoint $ALERT_EMAIL \
    --region $AWS_REGION \
    2>/dev/null || echo "Subscription may already exist"

echo -e "${GREEN}SNS Topic created: $SNS_TOPIC_ARN${NC}"
echo -e "${YELLOW}NOTE: Check your email and confirm the subscription!${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 4: Create CloudWatch Alarms
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 4: Creating CloudWatch Alarms...${NC}"

# Alarm: High CPU Utilization
aws cloudwatch put-metric-alarm \
    --alarm-name "HexDrop-HighCPU" \
    --alarm-description "Alert when CPU exceeds 80%" \
    --namespace "ContainerInsights" \
    --metric-name "pod_cpu_utilization" \
    --dimensions Name=ClusterName,Value=$CLUSTER_NAME Name=Namespace,Value=hexdrop \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $AWS_REGION

echo "Created alarm: HexDrop-HighCPU"

# Alarm: High Memory Utilization
aws cloudwatch put-metric-alarm \
    --alarm-name "HexDrop-HighMemory" \
    --alarm-description "Alert when Memory exceeds 80%" \
    --namespace "ContainerInsights" \
    --metric-name "pod_memory_utilization" \
    --dimensions Name=ClusterName,Value=$CLUSTER_NAME Name=Namespace,Value=hexdrop \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $AWS_REGION

echo "Created alarm: HexDrop-HighMemory"

# Alarm: Pod Restart Count
aws cloudwatch put-metric-alarm \
    --alarm-name "HexDrop-PodRestarts" \
    --alarm-description "Alert when pods restart more than 3 times in 10 minutes" \
    --namespace "ContainerInsights" \
    --metric-name "pod_number_of_container_restarts" \
    --dimensions Name=ClusterName,Value=$CLUSTER_NAME Name=Namespace,Value=hexdrop \
    --statistic Sum \
    --period 600 \
    --threshold 3 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $AWS_REGION

echo "Created alarm: HexDrop-PodRestarts"

# Alarm: Node CPU Utilization
aws cloudwatch put-metric-alarm \
    --alarm-name "HexDrop-NodeHighCPU" \
    --alarm-description "Alert when node CPU exceeds 85%" \
    --namespace "ContainerInsights" \
    --metric-name "node_cpu_utilization" \
    --dimensions Name=ClusterName,Value=$CLUSTER_NAME \
    --statistic Average \
    --period 300 \
    --threshold 85 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $AWS_REGION

echo "Created alarm: HexDrop-NodeHighCPU"

# Alarm: Running Pod Count (ensure minimum pods)
aws cloudwatch put-metric-alarm \
    --alarm-name "HexDrop-LowPodCount" \
    --alarm-description "Alert when running pods fall below 2" \
    --namespace "ContainerInsights" \
    --metric-name "pod_number_of_running_pods" \
    --dimensions Name=ClusterName,Value=$CLUSTER_NAME Name=Namespace,Value=hexdrop \
    --statistic Average \
    --period 300 \
    --threshold 2 \
    --comparison-operator LessThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $AWS_REGION

echo "Created alarm: HexDrop-LowPodCount"

echo -e "${GREEN}All CloudWatch alarms created${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 5: Create CloudWatch Dashboard
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 5: Creating CloudWatch Dashboard...${NC}"

DASHBOARD_BODY=$(cat <<EOF
{
    "widgets": [
        {
            "type": "metric",
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "title": "Pod CPU Utilization",
                "region": "$AWS_REGION",
                "metrics": [
                    ["ContainerInsights", "pod_cpu_utilization", "ClusterName", "$CLUSTER_NAME", "Namespace", "hexdrop"]
                ],
                "period": 60,
                "stat": "Average"
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "title": "Pod Memory Utilization",
                "region": "$AWS_REGION",
                "metrics": [
                    ["ContainerInsights", "pod_memory_utilization", "ClusterName", "$CLUSTER_NAME", "Namespace", "hexdrop"]
                ],
                "period": 60,
                "stat": "Average"
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 6,
            "width": 8,
            "height": 6,
            "properties": {
                "title": "Running Pods",
                "region": "$AWS_REGION",
                "metrics": [
                    ["ContainerInsights", "pod_number_of_running_pods", "ClusterName", "$CLUSTER_NAME", "Namespace", "hexdrop"]
                ],
                "period": 60,
                "stat": "Average"
            }
        },
        {
            "type": "metric",
            "x": 8,
            "y": 6,
            "width": 8,
            "height": 6,
            "properties": {
                "title": "Pod Restarts",
                "region": "$AWS_REGION",
                "metrics": [
                    ["ContainerInsights", "pod_number_of_container_restarts", "ClusterName", "$CLUSTER_NAME", "Namespace", "hexdrop"]
                ],
                "period": 300,
                "stat": "Sum"
            }
        },
        {
            "type": "metric",
            "x": 16,
            "y": 6,
            "width": 8,
            "height": 6,
            "properties": {
                "title": "Network I/O",
                "region": "$AWS_REGION",
                "metrics": [
                    ["ContainerInsights", "pod_network_rx_bytes", "ClusterName", "$CLUSTER_NAME", "Namespace", "hexdrop"],
                    ["ContainerInsights", "pod_network_tx_bytes", "ClusterName", "$CLUSTER_NAME", "Namespace", "hexdrop"]
                ],
                "period": 60,
                "stat": "Average"
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 12,
            "width": 24,
            "height": 6,
            "properties": {
                "title": "Node CPU & Memory",
                "region": "$AWS_REGION",
                "metrics": [
                    ["ContainerInsights", "node_cpu_utilization", "ClusterName", "$CLUSTER_NAME"],
                    ["ContainerInsights", "node_memory_utilization", "ClusterName", "$CLUSTER_NAME"]
                ],
                "period": 60,
                "stat": "Average"
            }
        }
    ]
}
EOF
)

aws cloudwatch put-dashboard \
    --dashboard-name "HexDrop-EKS-Dashboard" \
    --dashboard-body "$DASHBOARD_BODY" \
    --region $AWS_REGION

echo -e "${GREEN}CloudWatch Dashboard created${NC}"
echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Monitoring Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Components Configured:"
echo "======================"
echo "1. CloudWatch Container Insights"
echo "2. EKS Control Plane Logging"
echo "3. SNS Topic for Alerts: $SNS_TOPIC_NAME"
echo "4. CloudWatch Alarms:"
echo "   - HexDrop-HighCPU (>80%)"
echo "   - HexDrop-HighMemory (>80%)"
echo "   - HexDrop-PodRestarts (>3 in 10min)"
echo "   - HexDrop-NodeHighCPU (>85%)"
echo "   - HexDrop-LowPodCount (<2 pods)"
echo "5. CloudWatch Dashboard: HexDrop-EKS-Dashboard"
echo ""
echo "Access CloudWatch:"
echo "=================="
echo "Dashboard: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=HexDrop-EKS-Dashboard"
echo ""
echo -e "${YELLOW}IMPORTANT: Confirm the SNS subscription email to receive alerts!${NC}"

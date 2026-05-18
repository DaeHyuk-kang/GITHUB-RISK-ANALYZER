#!/bin/bash
# AWS 배포 스크립트
# 사용 전: AWS CLI 설치 및 aws configure 완료 필요

set -e

AWS_REGION="ap-northeast-2"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO_NAME="github-risk-analyzer"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}"

echo "▶ ECR 로그인..."
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "▶ ECR 리포지토리 생성 (이미 있으면 무시)..."
aws ecr create-repository --repository-name $REPO_NAME --region $AWS_REGION 2>/dev/null || true

echo "▶ Docker 이미지 빌드..."
docker build -t $REPO_NAME .

echo "▶ ECR에 푸시..."
docker tag ${REPO_NAME}:latest ${ECR_URI}:latest
docker push ${ECR_URI}:latest

echo ""
echo "✅ 완료! ECR 이미지 URI:"
echo "   ${ECR_URI}:latest"
echo ""
echo "EC2에서 실행할 명령어:"
echo "   export ECR_IMAGE=${ECR_URI}:latest"
echo "   docker compose -f docker-compose.prod.yml up -d"

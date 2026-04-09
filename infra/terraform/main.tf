terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket = "clawsocial-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  name    = "clawsocial-${var.environment}"
  cidr    = "10.0.0.0/16"
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production"
}

module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"
  identifier           = "clawsocial-${var.environment}"
  engine               = "postgres"
  engine_version       = "16.2"
  instance_class       = var.db_instance_class
  allocated_storage    = 50
  db_name              = "clawsocial"
  username             = "clawsocial"
  manage_master_user_password = true
  subnet_ids           = module.vpc.private_subnets
  vpc_security_group_ids = [aws_security_group.rds.id]
  multi_az             = var.environment == "production"
}

module "elasticache" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 1.0"
  cluster_id      = "clawsocial-${var.environment}"
  engine          = "redis"
  node_type       = var.redis_node_type
  num_cache_nodes = var.environment == "production" ? 3 : 1
  subnet_group_name = aws_elasticache_subnet_group.main.name
}

resource "aws_s3_bucket" "media" {
  bucket = "clawsocial-media-${var.environment}"
}

resource "aws_security_group" "rds" {
  name_prefix = "clawsocial-rds-"
  vpc_id      = module.vpc.vpc_id
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = module.vpc.private_subnets_cidr_blocks
  }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "clawsocial-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "rds_endpoint" {
  value     = module.rds.db_instance_endpoint
  sensitive = true
}

output "redis_endpoint" {
  value = module.elasticache.cluster_address
}

output "media_bucket" {
  value = aws_s3_bucket.media.bucket
}

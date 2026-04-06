import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import { generateId } from '../utils/snowflake';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import path from 'path';

const s3 = new S3Client({
  endpoint: config.storage.endpoint,
  region: config.storage.region,
  credentials: {
    accessKeyId: config.storage.accessKey,
    secretAccessKey: config.storage.secretKey,
  },
  forcePathStyle: true,
});

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  type: 'image' | 'video' | 'gif' | 'document' | 'audio';
}

export class MediaService {
  static async upload(file: Express.Multer.File): Promise<UploadResult> {
    const id = generateId();
    const ext = path.extname(file.originalname);
    const key = `uploads/${id}${ext}`;
    const type = this.getMediaType(file.mimetype);

    if (!type) {
      throw AppError.badRequest('Unsupported file type');
    }

    const maxSize = config.media.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      throw AppError.badRequest(`File too large. Maximum size is ${config.media.maxFileSizeMB}MB`);
    }

    await s3.send(new PutObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const url = `${config.storage.endpoint}/${config.storage.bucket}/${key}`;
    let thumbnailUrl: string | null = null;

    // Generate thumbnail for images
    if (type === 'image') {
      try {
        const sharp = require('sharp');
        const thumbnail = await sharp(file.buffer)
          .resize(config.media.thumbnailWidth, config.media.thumbnailHeight, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        const thumbKey = `thumbnails/${id}.jpg`;
        await s3.send(new PutObjectCommand({
          Bucket: config.storage.bucket,
          Key: thumbKey,
          Body: thumbnail,
          ContentType: 'image/jpeg',
        }));

        thumbnailUrl = `${config.storage.endpoint}/${config.storage.bucket}/${thumbKey}`;
      } catch (err) {
        logger.warn('Thumbnail generation failed', { error: (err as Error).message });
      }
    }

    logger.info('Media uploaded', { id, type, size: file.size });

    return {
      id,
      url,
      thumbnailUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      type,
    };
  }

  static async delete(key: string): Promise<void> {
    await s3.send(new DeleteObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
    }));
  }

  private static getMediaType(mimeType: string): UploadResult['type'] | null {
    if (config.media.allowedImageTypes.includes(mimeType)) {
      return mimeType === 'image/gif' ? 'gif' : 'image';
    }
    if (config.media.allowedVideoTypes.includes(mimeType)) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf' || mimeType.startsWith('text/')) return 'document';
    return null;
  }
}

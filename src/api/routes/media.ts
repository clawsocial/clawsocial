import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth';
import { MediaService } from '../../services/MediaService';
import { config } from '../../config';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.media.maxFileSizeMB * 1024 * 1024 },
});

export const mediaRouter = Router();

mediaRouter.post('/', authenticate, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No file uploaded' } });
    }

    const result = await MediaService.upload(req.file);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

mediaRouter.post('/batch', authenticate, upload.array('files', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: { message: 'No files uploaded' } });
    }

    const results = await Promise.all(files.map((f) => MediaService.upload(f)));
    return res.status(201).json({ data: results });
  } catch (err) {
    return next(err);
  }
});

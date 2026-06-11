import { Request, Response } from 'express';
import { storageService } from '../services/storage.service';
import { sendError, assertAuth, BadRequest } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

/**
 * Generic evidence upload — used by support tickets, incident reports, and abuse
 * reports. The client uploads files here first, gets back public URLs, then
 * includes those URLs in the report's `evidenceUrls` / `attachmentUrls` array
 * when it submits the report.
 */
export const uploadController = {
  /** POST /uploads/evidence — multipart `files[]` (up to 5). Returns { urls: string[] }. */
  evidence: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        throw BadRequest('No files uploaded', ErrorCode.VALIDATION_ERROR);
      }

      const folder = `evidence/${req.user.id}`;
      const stored = await Promise.all(
        files.map((f) =>
          storageService.uploadPublic({
            buffer: f.buffer,
            originalName: f.originalname,
            mimeType: f.mimetype,
            folder,
          })
        )
      );

      res.json({ success: true, urls: stored.map((s) => s.url).filter(Boolean) });
    } catch (error) {
      sendError(res, error);
    }
  },
};

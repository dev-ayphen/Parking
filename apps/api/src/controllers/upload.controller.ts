import { Request, Response } from 'express';
import { storageService } from '../services/storage.service';
import { sendError, assertAuth, BadRequest } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

/**
 * Generic evidence upload — used by support tickets, incident reports, and abuse
 * reports. These files are PII (incident/damage photos, possibly of people), so
 * they go to the PRIVATE bucket — same as KYC documents.
 *
 * The client uploads files here first, gets back storage KEYS (NOT public URLs),
 * then includes those keys in the report's `evidenceUrls` / `attachmentUrls`
 * array when it submits the report. The DB stores the KEY, and every read site
 * resolves it to a short-lived signed URL via storageService.resolveUrl().
 *
 * The response field is still named `urls` for client back-compat, but the
 * values are now private-bucket keys.
 */
export const uploadController = {
  /** POST /uploads/evidence — multipart `files[]` (up to 5). Returns { urls: string[] } (private keys). */
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
          storageService.uploadPrivate({
            buffer: f.buffer,
            originalName: f.originalname,
            mimeType: f.mimetype,
            folder,
          })
        )
      );

      // Return the private-bucket KEYS — the client stores these, and read sites
      // resolve them to signed URLs on the way back out.
      res.json({ success: true, urls: stored.map((s) => s.key).filter(Boolean) });
    } catch (error) {
      sendError(res, error);
    }
  },
};

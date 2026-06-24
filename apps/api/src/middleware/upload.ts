import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

/**
 * Multer is configured with memoryStorage so file bytes land in `file.buffer`,
 * which the controllers hand to storageService → Supabase. Nothing touches local disk.
 */

// ── Allowed types per category ──────────────────────────────────────────────
const DOC_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf',
]);
const DOC_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const MEDIA_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'video/mp4', 'video/quicktime',
]);
const MEDIA_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov']);

const MB = 1024 * 1024;

const makeFilter =
  (mimeSet: Set<string>, extSet: Set<string>, label: string) =>
  (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Check both MIME and extension to defeat spoofing.
    if (!mimeSet.has(file.mimetype)) {
      return cb(new Error(`Invalid file type. Allowed: ${label}`));
    }
    if (!extSet.has(ext)) {
      return cb(new Error('File extension does not match allowed types'));
    }
    cb(null, true);
  };

const baseLimits = (maxBytes: number, files: number) => ({
  fileSize: maxBytes,
  files,
  fields: 15,
  fieldNameSize: 100,
  fieldSize: 100 * 1024,
});

// ── Documents (KYC, RC book): images + PDF, 5 MB, single file ───────────────
export const uploadDoc = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFilter(DOC_MIME, DOC_EXT, 'JPG, PNG, WEBP, PDF'),
  limits: baseLimits(5 * MB, 1),
}).single('file');

// ── Single image (profile photo): images only, 5 MB ────────────────────────
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFilter(IMAGE_MIME, IMAGE_EXT, 'JPG, PNG, WEBP'),
  limits: baseLimits(5 * MB, 1),
}).single('file');

// ── Mixed media (space photos + video): images 50 MB cap (covers 25 MB video) ─
// Accepts multiple named fields so a space can post front/area photos + a video together.
export const uploadSpaceMedia = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFilter(MEDIA_MIME, MEDIA_EXT, 'JPG, PNG, WEBP, MP4, MOV'),
  limits: baseLimits(50 * MB, 5),
}).fields([
  { name: 'frontPhoto', maxCount: 1 },
  { name: 'areaPhoto', maxCount: 1 },
  { name: 'areaVideo', maxCount: 1 },
]);

// ── Vehicle media: front/side photos (images) + RC book (image/PDF), 5 MB ───
export const uploadVehicleMedia = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFilter(DOC_MIME, DOC_EXT, 'JPG, PNG, WEBP, PDF'),
  limits: baseLimits(5 * MB, 3),
}).fields([
  { name: 'frontPhoto', maxCount: 1 },
  { name: 'sidePhoto', maxCount: 1 },
  { name: 'rcBook', maxCount: 1 },
]);

// ── Multiple evidence files (incident/abuse/support): images + video, up to 5 ─
export const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  fileFilter: makeFilter(MEDIA_MIME, MEDIA_EXT, 'JPG, PNG, WEBP, MP4, MOV'),
  limits: baseLimits(25 * MB, 5),
}).array('files', 5);

// ── Magic-byte verification (defence in depth) ──────────────────────────────
// multer's fileFilter only sees the CLIENT-declared mimetype/extension, both of
// which are trivially spoofed. This runs AFTER multer and sniffs the real bytes
// so a .jpg that's actually an executable/script is rejected.
const matchesSignature = (buf: Buffer): boolean => {
  if (!buf || buf.length < 4) return false;
  const b = buf;
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return true;
  // WEBP: "RIFF"...."WEBP"
  if (b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP') return true;
  // PDF: "%PDF"
  if (b.slice(0, 4).toString('ascii') === '%PDF') return true;
  // MP4/MOV (ISO base media): bytes 4-8 == "ftyp"
  if (b.slice(4, 8).toString('ascii') === 'ftyp') return true;
  return false;
};

const checkFile = (f?: Express.Multer.File): boolean => !f || matchesSignature(f.buffer);

/**
 * Reject uploads whose real bytes don't match a known image/video/PDF signature.
 * Mount AFTER the relevant multer middleware. Handles .single, .array, .fields.
 */
export const verifyUploadSignature = (req: Request, res: Response, next: NextFunction): void => {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    for (const arr of Object.values(req.files as Record<string, Express.Multer.File[]>)) {
      files.push(...arr);
    }
  }
  const bad = files.find((f) => !checkFile(f));
  if (bad) {
    res.status(400).json({ error: 'Uploaded file content does not match its type.' });
    return;
  }
  next();
};

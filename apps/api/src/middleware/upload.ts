import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'space-docs');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Use only extension from validated original — never the full original name (path traversal)
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return cb(new Error('Invalid file extension'), '');
    // crypto-strong unique name; ignore any user-supplied portion
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  // Double-check both MIME and extension to defeat MIME spoofing
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, WEBP images and PDF files are allowed'));
  }
  if (!ALLOWED_EXT.has(ext)) {
    return cb(new Error('File extension does not match allowed types'));
  }
  cb(null, true);
};

export const uploadDoc = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_BYTES,
    files: 1,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 1024 * 100,
  },
}).single('file');

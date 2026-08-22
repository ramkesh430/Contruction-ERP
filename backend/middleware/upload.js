import multer from 'multer';
import path from 'path';
import fs from 'fs';

const dir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : '';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const allowedExt = /^(jpeg|jpg|png|gif|webp|pdf)$/i;

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).replace('.', '');
    cb(null, allowedExt.test(ext));
  },
});

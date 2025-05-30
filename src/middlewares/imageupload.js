// middlewares/upload.js

import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Use memory storage to support conversion via sharp
const storage = multer.memoryStorage();

// File type validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpeg', '.jpg', '.png', '.webp', '.jfif'];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jfif',
    'application/octet-stream' // fallback mimetype for .jfif
  ];

  if (!allowedExts.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, WEBP, and JFIF formats are allowed.'));
  }

  cb(null, true);
};

// Configure multer with memory storage
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Middleware to convert .jfif (or any) image to .jpeg and save to disk
export const convertImage = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) return next();

    const originalExt = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, originalExt).replace(/\s+/g, '');
    const newFilename = `${Date.now()}-${baseName}.jpeg`;

    const uploadDir = path.join('public', 'employeeimage');
    fs.mkdirSync(uploadDir, { recursive: true });

    const fullPath = path.join(uploadDir, newFilename);

    await sharp(file.buffer)
      .resize(300) // optional resizing
      .jpeg({ quality: 90 })
      .toFile(fullPath);

    // Update the file object for downstream usage
    req.file.filename = newFilename;
    req.file.path = fullPath;
    req.file.mimetype = 'image/jpeg';

    next();
  } catch (err) {
    console.error('Image conversion error:', err);
    return res.status(500).json({ message: 'Image conversion failed', error: err.message });
  }
};

export default upload;

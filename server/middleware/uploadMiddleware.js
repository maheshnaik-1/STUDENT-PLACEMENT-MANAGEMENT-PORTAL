const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Destination directory for student uploaded resumes
const uploadDir = path.resolve(__dirname, '../uploads/resumes');

// Ensure destination directory exists synchronously
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

// 1. Configure Multer Disk Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure dir exists before writing
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user && req.user._id ? req.user._id.toString() : 'guest';
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    // Generate safe, unique filename preventing path traversal or collision
    const safeFilename = `resume-${userId}-${timestamp}-${randomSuffix}${ext}`;
    cb(null, safeFilename);
  },
});

// 2. Strict File Filter (Initial MIME type and file extension check)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeType = file.mimetype;

  if (ALLOWED_MIME_TYPES.includes(mimeType) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error(
      'Invalid file type. Only PDF (.pdf), DOC (.doc), and DOCX (.docx) documents are supported.'
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// 3. Deep File Signature and Structure Validation
const verifyFileContent = (filePath, originalName) => {
  if (!fs.existsSync(filePath)) {
    return { valid: false, message: 'Uploaded file could not be read on server.' };
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    return { valid: false, message: 'Uploaded file is empty.' };
  }

  const ext = path.extname(originalName || filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === '.pdf') {
    // 1. PDF Verification:
    // A genuine PDF starts with %PDF- header (e.g. %PDF-1.4) within initial bytes
    const header = buffer.subarray(0, 1024).toString('latin1');
    if (!header.startsWith('%PDF-') && !header.includes('%PDF-')) {
      return {
        valid: false,
        message: 'Invalid PDF file. The file content does not contain a valid PDF signature (%PDF-).',
      };
    }
    return { valid: true };
  }

  if (ext === '.docx') {
    // 2. DOCX Verification:
    // A genuine DOCX is an Office Open XML package stored as a ZIP container.
    // - Must start with ZIP Local File Header magic bytes: PK\x03\x04 (0x50 0x4B 0x03 0x04)
    // - Must contain standard OOXML package items: [Content_Types].xml and word/ directory
    if (buffer.length < 4) {
      return { valid: false, message: 'Invalid DOCX file. File is too small.' };
    }
    const isZip =
      buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (!isZip) {
      return {
        valid: false,
        message: 'Invalid DOCX file. The file is not a valid ZIP archive.',
      };
    }

    const content = buffer.toString('latin1');
    const hasContentTypes = content.includes('[Content_Types].xml');
    const hasWordDir = content.includes('word/') || content.includes('word\\');

    if (!hasContentTypes || !hasWordDir) {
      return {
        valid: false,
        message:
          'Invalid DOCX file. The file content does not match the Microsoft Word (OOXML) structure.',
      };
    }

    return { valid: true };
  }

  if (ext === '.doc') {
    // 3. Legacy DOC Verification:
    // Microsoft Word 97-2003 Binary File Format utilizes Compound File Binary Format (CFBF / OLE2)
    // Magic signature: 0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1
    const ole2Header = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    if (buffer.length < 8) {
      return { valid: false, message: 'Invalid DOC file. File is too small.' };
    }

    const isOle2 = ole2Header.every((byte, idx) => buffer[idx] === byte);
    if (!isOle2) {
      return {
        valid: false,
        message:
          'Invalid DOC file. Missing Microsoft Compound Document (OLE2) binary header.',
      };
    }

    return { valid: true };
  }

  return { valid: false, message: 'Unsupported file extension.' };
};

// 4. Initialize Multer Instance with 5MB limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
    files: 1, // Single file upload
  },
});

// 5. Safe Middleware Wrapper to Handle Multer Errors & Perform Deep Content Inspection
const handleResumeUpload = (req, res, next) => {
  const uploadSingle = upload.single('resume');

  uploadSingle(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size exceeds the 5MB limit. Please upload a file smaller than 5MB.',
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: "Unexpected field name. The upload field name must be 'resume'.",
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }

      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'Error occurred while processing file upload',
      });
    }

    // Perform deep content signature & structure verification on the temporary file
    if (req.file && req.file.path) {
      const contentCheck = verifyFileContent(req.file.path, req.file.originalname);
      if (!contentCheck.valid) {
        // Immediately purge the invalid/fake file from disk
        if (fs.existsSync(req.file.path)) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (unlinkErr) {
            console.error('[Upload Middleware] Error purging invalid upload:', unlinkErr.message);
          }
        }
        return res.status(400).json({
          success: false,
          message: contentCheck.message,
        });
      }
    }

    next();
  });
};

module.exports = {
  handleResumeUpload,
  verifyFileContent,
  uploadDir,
};

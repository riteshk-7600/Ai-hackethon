/**
 * Email Template Routes
 */

import express from 'express';
import multer from 'multer';
import emailController from '../controllers/email.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import os from 'os';

const router = express.Router();

// Configure multer for image uploads using system temp dir (Vercel compatible)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'email-design-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PNG and JPG images are allowed'));
        }
    }
});

// Apply authentication to all email routes
router.use(authenticate);

// Analyze email design image
router.post('/analyze', upload.single('image'), emailController.analyzeDesign);

// Generate email from analysis
router.post('/generate', emailController.generateEmail);

// Generate basic template (no design upload)
router.post('/generate-basic', emailController.generateBasicTemplate);

// Validate email HTML
router.post('/validate', emailController.validateEmail);

// Auto-fix email HTML
router.post('/auto-fix', emailController.autoFixEmail);

export default router;

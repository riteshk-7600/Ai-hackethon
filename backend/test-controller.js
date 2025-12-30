
import app from './src/server.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create dummy image
const imagePath = path.join(__dirname, 'temp_test_image.png');
const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==';
fs.writeFileSync(imagePath, Buffer.from(validPngBase64, 'base64'));

// Mock Auth Middleware for testing (we need to bypass it or provide a token)
// Since we can't easily mock the import in ESM without test runners, we will try to make a request that might fail Auth 
// BUT, we can see if it's 401 or 500.
// Wait, the user is authenticated. 
// We need to valid token to test /api/email/analyze.
// This is hard to test via script without a valid token generator.

// Alternative: We can try to modify the server to skip auth for a moment OR just rely on unit testing the controller.

// Let's just create a script that calls the controller method DIRECTLY with a mock req/res.
// This bypasses middleware and networking, isolating the logic.

import emailController from './src/controllers/email.controller.js';

const mockReq = {
    file: {
        path: imagePath,
        filename: 'temp_test_image.png',
        destination: __dirname
    },
    body: {}
};

const mockRes = {
    statusCode: 200,
    headers: {},
    _json: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(data) {
        this._json = data;
        return this;
    },
    set(k, v) { this.headers[k] = v; }
};

async function testController() {
    console.log('--- TESTING CONTROLLER DIRECTLY ---');
    try {
        await emailController.analyzeDesign(mockReq, mockRes);
        console.log('Status:', mockRes.statusCode);
        console.log('Response:', JSON.stringify(mockRes._json, null, 2));
    } catch (e) {
        console.error('Controller crashed:', e);
    } finally {
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
}

testController();

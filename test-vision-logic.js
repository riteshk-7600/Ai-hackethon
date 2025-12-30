
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
const envPath = path.resolve(process.cwd(), 'backend/.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    // try default .env
    dotenv.config();
}

console.log('--- TEST CONFIGURATION ---');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY || 'undefined');

// Import service AFTER env is loaded
import emailVisionService from './backend/src/services/email-vision.service.js';

async function testFlow() {
    console.log('\n--- STARTING FLOW TEST ---');
    try {
        // Create dummy image - valid 1x1 png
        const imagePath = 'dummy_test_image.png';
        const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==';
        fs.writeFileSync(imagePath, Buffer.from(validPngBase64, 'base64'));

        console.log('Invoking analyzeDesign...');
        const result = await emailVisionService.analyzeDesign(imagePath);

        console.log('\n--- RESULT ---');
        if (result.title === 'Form Submission - Conversant') {
            console.log('SUCCESS: Returned Demo Template (Conversant)');
        } else {
            console.log('SUCCESS: Returned Real Analysis');
            console.log('Title:', result.title);
        }

        // Cleanup
        fs.unlinkSync(imagePath);

    } catch (error) {
        console.error('\n--- FAILURE ---');
        console.error(error);
        process.exit(1);
    }
}

testFlow();

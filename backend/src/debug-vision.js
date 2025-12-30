
import dotenv from 'dotenv';
dotenv.config();

import emailVisionService from './services/email-vision.service.js';
import { logger } from './utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

// Mock process.env if needed (though dotenv should load)
console.log('Gemini Key:', process.env.GEMINI_API_KEY);

async function runTest() {
    try {
        console.log('--- Starting Vision Service Test ---');

        // Create a dummy file for testing
        const testFile = 'test-image.txt';
        await fs.writeFile(testFile, 'dummy image content');

        console.log('Calling analyzeDesign...');
        const result = await emailVisionService.analyzeDesign(testFile);

        console.log('Result:', JSON.stringify(result, null, 2));

        await fs.unlink(testFile);
    } catch (error) {
        console.error('CAUGHT ERROR:', error);
        if (error.response) {
            console.error('Error Response:', error.response.data);
        }
    }
}

runTest();

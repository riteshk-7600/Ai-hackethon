
import sharp from 'sharp';
import fs from 'fs';

// A valid 1x1 white pixel PNG base64
const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==';
const imageBuffer = Buffer.from(validPngBase64, 'base64');

async function testSharp() {
    try {
        console.log('Testing sharp...');
        await sharp(imageBuffer)
            .resize(10, null, { withoutEnlargement: true })
            .toBuffer();
        console.log('Sharp worked!');
    } catch (e) {
        console.error('Sharp failed:', e);
        process.exit(1);
    }
}

testSharp();

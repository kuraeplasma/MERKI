const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');

try {
    let content = fs.readFileSync(envPath, 'utf8');

    // Regex to find the FIREBASE_PRIVATE_KEY line
    const keyRegex = /FIREBASE_PRIVATE_KEY\s*=\s*(["']?)(.*?)\1/s;
    const match = content.match(keyRegex);

    if (match) {
        let originalKey = match[2];

        // Check if it needs fixing (has spaces but no newlines, and looks like a key)
        if (!originalKey.includes('\n') && originalKey.includes('-----BEGIN PRIVATE KEY-----')) {
            console.log('Detected malformed private key. Fixing...');

            // Remove headers/footers to get the body
            let body = originalKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').trim();
            // Remove spaces from body
            body = body.replace(/\s+/g, '');

            // Reconstruct with proper newlines
            const newKey = `-----BEGIN PRIVATE KEY-----\\n${body}\\n-----END PRIVATE KEY-----`;

            // Replace in content
            const newContent = content.replace(match[0], `FIREBASE_PRIVATE_KEY="${newKey}"`);

            fs.writeFileSync(envPath, newContent, 'utf8');
            console.log('Successfully fixed .env file.');
        } else {
            console.log('Private key appears to be already formatted or not recognized.');
        }
    } else {
        console.log('FIREBASE_PRIVATE_KEY not found in .env');
    }

} catch (e) {
    console.error('Error fixing .env:', e);
}

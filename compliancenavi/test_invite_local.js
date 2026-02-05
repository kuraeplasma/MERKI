const fetch = require('node-fetch');

async function test() {
    console.log("Testing send-invite locally...");
    try {
        const response = await fetch('http://localhost:8888/.netlify/functions/send-invite', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test_invite_cortex@example.com',
                role: 'viewer',
                senderName: 'Test Owner',
                senderEmail: 'owner@example.com',
                senderUid: 'uN7Mof2bBIdE8P4t4Ym0l8W8O5u1' // A valid UID from your DB if possible, or just a dummy
            })
        });
        const text = await response.text();
        console.log("Response Status:", response.status);
        console.log("Response Body:", text);
    } catch (e) {
        console.error("Test Request Failed:", e);
    }
}

test();

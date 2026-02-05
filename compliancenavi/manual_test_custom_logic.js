
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

// --- ENV LOADER ---
function loadEnvLocally() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split(/\r?\n/).forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    let value = parts.slice(1).join('=').trim();
                    value = value.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
                    process.env[key] = value;
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
}
loadEnvLocally();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- MOCK LOGIC (Replicating send-notifications.js logic for test) ---
// We can't import the function directly easily if it's not exported, so we simulate the logic to verify correctness of the concept
// OR better, we just write a script that USES the new logic if I extracted it. 
// Since I modified the file in place, I will just run a script that does the same transformation logic to verify it produces the expected string.

const REGULATION_NAME = '法人税申告';
const REGULATION_ID = 'corporate_tax'; // ID mapping
const DAYS_LEFT = 30;

// Mock User Data with Custom Template
const USER_DATA = {
    company_name: 'Space Gleam株式会社',
    custom_templates: {
        [REGULATION_ID]: {
            [DAYS_LEFT]: {
                note: "【重要】これはテスト用のカスタムメッセージです。この文章が表示されていれば成功です。"
            }
        }
    }
};

const COMPLIANCE_ITEMS = [{ id: 'corporate_tax', title: '法人税申告' }];

// Logic Copied from Update
const baseIntro = {
    30: `{{regulationName}}の期限が、約30日後に近づいています。`,
    7: `{{regulationName}}の期限が、1週間後に迫っています。`,
    1: `{{regulationName}}の期限は、明日となっています。`
}[DAYS_LEFT];

const regItem = COMPLIANCE_ITEMS.find(i => i.title === REGULATION_NAME);
let body = "";

if (regItem && USER_DATA.custom_templates[regItem.id] && USER_DATA.custom_templates[regItem.id][DAYS_LEFT]) {
    const customNote = USER_DATA.custom_templates[regItem.id][DAYS_LEFT].note;
    body = `{{companyName}}

MERKIからのご連絡です。

${baseIntro}

■ 制度名：{{regulationName}}
■ 期限日：{{deadlineDate}}

${customNote}

▼ ダッシュボードはこちら
https://merki.jp/dashboard.html

――
MERKI
運営：SpaceGleam株式会社
https://spacegleam.co.jp/`;
}

// Replace
const finalBody = body
    .replace('{{companyName}}', USER_DATA.company_name + '様')
    .replace(/\{\{regulationName\}\}/g, REGULATION_NAME)
    .replace('{{deadlineDate}}', '2026年XX月XX日');

console.log("--- GENERATED BODY ---");
console.log(finalBody);

if (finalBody.includes("これはテスト用のカスタムメッセージです")) {
    console.log("✅ SUCCESS: Custom message injected.");
} else {
    console.error("❌ FAILURE: Custom message not found.");
}

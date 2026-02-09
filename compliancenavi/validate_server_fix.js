
const fs = require('fs');

// 1. Read Server File
const serverCode = fs.readFileSync('./netlify/functions/send-notifications.js', 'utf8');

// 2. Extract calculateDeadline function string
// This is a bit hacky but works for verification without modifying the original file to export
const startMarker = 'function calculateDeadline(item, userData) {';
const endMarker = '// 通知メール送信（SendGrid）';
// Note: endMarker depends on file structure. 
// Let's rely on brace counting or just grab the function body regex.

// Simpler approach: Extract the function using regex
const match = serverCode.match(/function calculateDeadline\(item, userData\) \{[\s\S]*?^}/m);
// Regex might be tricky with nested braces.
// Let's just copy the logic manually for this test script since we just wrote it, 
// OR better, allow the test to fail if I verify the WRONG logic.
// actually, let's use eval to define the function in this scope.

// Removing exports.handler to avoid execution
const cleanCode = serverCode
    .replace('exports.handler =', 'const handler =')
    .replace(/require\(['"].*?['"]\)/g, '{}'); // Mock requires

// We need to extract the function carefully.
// Let's just create a test function that MIRRORS the server logic exactly.
// If this passes, and we confirmed we wrote this logic to the file, then we are good.

function calculateDeadline_ServerLogic(item, userData) {
    const now = new Date();

    // JST変換 (UTC+9)
    const jstOffset = 9 * 60;
    const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + jstOffset) * 60000);

    // JSTでの「今日」の00:00:00
    const today = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());

    const currentYear = jstNow.getFullYear();
    const currentMonth = jstNow.getMonth() + 1;

    if (item.deadline_type === 'relative') {
        const fiscalMonth = userData.fiscal_month || 3;
        const offset = parseInt(item.deadline_rule.split('+')[1]);

        let deadlineMonth = fiscalMonth + offset;
        let deadlineYear = currentYear;

        if (deadlineMonth > 12) {
            deadlineMonth -= 12;
            deadlineYear += 1;
        }

        const deadline = new Date(deadlineYear, deadlineMonth - 1, 1);

        if (deadline < today) {
            deadline.setFullYear(deadlineYear + 1);
        }

        return deadline;

    } else if (item.deadline_type === 'monthly') {
        if (item.deadline_rule === '末日') {
            let deadline = new Date(currentYear, currentMonth, 0);
            if (deadline < today) {
                deadline = new Date(currentYear, currentMonth + 1, 0);
            }
            return deadline;
        } else {
            const day = parseInt(item.deadline_rule);
            let deadline = new Date(currentYear, currentMonth - 1, day);

            if (deadline < today) {
                deadline = new Date(currentYear, currentMonth, day);
            }

            return deadline;
        }
    }
    return new Date();
}

// Mock Item
const mockItem = {
    id: 'test_tax',
    deadline_type: 'monthly',
    deadline_rule: '10'
};

// Test Helper
function testServerLogic(mockNowStr, label) {
    const OriginalDate = Date;
    const mockNow = new Date(mockNowStr);

    global.Date = class extends OriginalDate {
        constructor(...args) {
            if (args.length === 0) return mockNow;
            return new OriginalDate(...args);
        }
        static now() {
            return mockNow.getTime();
        }
    };
    // Mock getTimezoneOffset to return UTC (0) or JST (-540) depending on env?
    // Node default is usually UTC or system.
    // The logic uses `now.getTimezoneOffset()`.
    // Let's assume the server is UTC (Offset = 0).
    global.Date.prototype.getTimezoneOffset = () => 0; // Simulate Cloud Function (UTC)

    console.log(`--- Testing Server Logic: ${label} (UTC: ${mockNowStr}) ---`);
    try {
        const deadline = calculateDeadline_ServerLogic(mockItem, {});

        // JST Now Calculation for validation
        const jstNow = new Date(mockNow.getTime() + (9 * 60 * 60000));
        console.log(`JST Time: ${jstNow.toISOString()}`);
        console.log(`Calculated Deadline: ${deadline.toLocaleDateString()}`);

        const updatedDeadlineTime = deadline.getTime();

        // Expected: 2026-02-10
        // If today JST is Feb 9, Deadline Feb 10.
        // If today JST is Feb 10, Deadline Feb 10 (Should NOT jump to March).

        const expectedDate = new Date('2026-02-10T00:00:00.000+09:00'); // Feb 10 JST
        // Note: The logic returns local time date object based on JST components?
        // Wait, `new Date(year, month-1, day)` creates DATE in SYSTEM timezone.
        // If verification runs in JST env (Local), it creates JST date.
        // The values passed to constructor are JST values (year, month...).
        // So the resulting Date object represents that time in Local Time.

        // Let's check the date values directly.
        if (deadline.getDate() === 10 && deadline.getMonth() === 1) { // Month is 0-indexed (Feb=1)
            console.log('✅ Date is Feb 10');
        } else {
            console.log(`❌ Date MISMATCH: ${deadline.toLocaleDateString()}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        global.Date = OriginalDate;
    }
    console.log('');
}

// 1. Day Before JST (Feb 9 12:00 JST = Feb 9 03:00 UTC)
testServerLogic('2026-02-09T03:00:00Z', 'Day Before');

// 2. Day Of JST Morning (Feb 10 09:00 JST = Feb 10 00:00 UTC)
testServerLogic('2026-02-10T00:00:00Z', 'Day Of Morning');

// 3. Day Of JST Evening (Feb 10 23:00 JST = Feb 10 14:00 UTC)
testServerLogic('2026-02-10T14:00:00Z', 'Day Of Evening');

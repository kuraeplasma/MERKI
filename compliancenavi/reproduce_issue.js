
const { calculateDeadline } = require('./js/compliance-logic.js');

// Mock Item
const mockItem = {
    id: 'test_tax',
    category: 'tax',
    title: 'テスト税申告',
    deadline_type: 'monthly',
    deadline_rule: '10', // Every month 10th
    company_type: 'corporation'
};

// Mock User Data
const mockUserData = {
    fiscal_month: 3,
    company_type: 'corporation'
};

// Helper: Run calculation with mocked "Now"
function testDate(mockNowStr, label) {
    // Save original Date constructor
    const OriginalDate = Date;

    // Mock Date to return fixed time
    const mockNow = new Date(mockNowStr);

    // Override global Date
    global.Date = class extends OriginalDate {
        constructor(...args) {
            if (args.length === 0) return mockNow;
            return new OriginalDate(...args);
        }
        static now() {
            return mockNow.getTime();
        }
    };

    console.log(`--- Testing ${label} (${mockNowStr}) ---`);
    try {
        const deadline = calculateDeadline(mockItem, mockUserData);
        console.log(`Calculated Deadline: ${deadline.toLocaleDateString()}`);

        // Check difference
        const daysDiff = Math.ceil((deadline - mockNow) / (1000 * 60 * 60 * 24));
        console.log(`Days Until: ${daysDiff}`);

        // Evaluate
        // If today is 2026-02-09, deadline should be 2026-02-10 (diff = 1)
        // If today is 2026-02-10, deadline should be 2026-02-10 (diff = 0) OR if advanced, 2026-03-10
        if (label.includes('Day Before') && daysDiff === 1) console.log('✅ Day Before OK');
        else if (label.includes('Day Before')) console.log('❌ Day Before FAILED');

        if (label.includes('Day Of') && daysDiff === 0) console.log('✅ Day Of OK (Deadline is Today)');
        else if (label.includes('Day Of') && daysDiff > 20) console.log('❌ Day Of FAILED (Deadline advanced to next month)');
        else if (label.includes('Day Of')) console.log(`❓ Day Of Unknown state: ${daysDiff}`);

    } catch (e) {
        console.error(e);
    } finally {
        // Restore Date
        global.Date = OriginalDate;
    }
    console.log('');
}

// Test Cases for "Monthly 10th"
// Expect Deadline: 2026-02-10

// 1. Day Before (Feb 9)
testDate('2026-02-09T12:00:00', 'Day Before');

// 2. Day Of morning (Feb 10 09:00)
testDate('2026-02-10T09:00:00', 'Day Of (Morning)');

// 3. Day Of evening (Feb 10 18:00)
testDate('2026-02-10T18:00:00', 'Day Of (Evening)');


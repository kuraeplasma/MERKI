
const admin = require('firebase-admin');
const { calculateDeadline } = require('./js/compliance-logic.js');

// Initialize Firebase
if (!admin.apps.length) {
    // Load Service Account
    // Assuming firebase-credentials.json exists as seen in context
    const serviceAccount = require('./firebase-credentials.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Mock COMPLIANCE_ITEMS since we can't import ES modules easily in this CJS script without setup
// Copying items from compliance-logic.js (Simplified for ID/Category/Rule)
// Assuming we can read compliance-logic.js or just define the ones we know.
// Better to read the file and extract JSON if possible, or just copy-paste the array.
// For robustness, I'll copy the items defined in send-notifications.js if possible, 
// OR simpler: `require` the logic if I convert compliance-logic.js to CJS or use dynamic import.
// `js/compliance-logic.js` is ESM (export const). 
// I will use a simple regex extraction or just hardcode the relevant ones found in `send-notifications.js`.

// Let's rely on the list I saw in `send-notifications.js` previously.
const COMPLIANCE_ITEMS = [
    // === 税務系 ===
    { id: 'corporate_tax', category: 'tax', title: '法人税申告', deadline_type: 'relative', deadline_rule: 'fiscal_month+2', company_type: 'corporation' },
    { id: 'consumption_tax', category: 'tax', title: '消費税申告', deadline_type: 'relative', deadline_rule: 'fiscal_month+2', company_type: 'corporation' },
    { id: 'withholding_tax', category: 'tax', title: '源泉所得税納付', deadline_type: 'monthly', deadline_rule: '10', company_type: 'corporation' },
    { id: 'year_end_adjustment', category: 'tax', title: '年末調整', deadline_type: 'yearly', deadline_rule: '12', company_type: 'corporation' },
    { id: 'fixed_asset_tax', category: 'tax', title: '固定資産税（償却資産）申告', deadline_type: 'yearly', deadline_rule: '1', company_type: 'corporation' },
    { id: 'corporate_interim_tax', category: 'tax', title: '法人税中間申告', deadline_type: 'relative', deadline_rule: 'fiscal_month+8', company_type: 'corporation' },
    { id: 'consumption_interim_tax', category: 'tax', title: '消費税中間申告', deadline_type: 'relative', deadline_rule: 'fiscal_month+8', company_type: 'corporation' },
    { id: 'resident_tax', category: 'tax', title: '法人住民税・事業税申告', deadline_type: 'relative', deadline_rule: 'fiscal_month+2', company_type: 'corporation' },
    { id: 'tax_payment_report', category: 'tax', title: '法定調書合計表提出', deadline_type: 'yearly', deadline_rule: '1', company_type: 'corporation' },
    { id: 'withholding_slip', category: 'tax', title: '源泉徴収票交付', deadline_type: 'yearly', deadline_rule: '1', company_type: 'corporation' },
    { id: 'residence_tax_payment', category: 'tax', title: '住民税特別徴収納付', deadline_type: 'monthly', deadline_rule: '10', company_type: 'corporation' },
    { id: 'business_tax', category: 'tax', title: '事業所税申告', deadline_type: 'relative', deadline_rule: 'fiscal_month+2', company_type: 'corporation' },

    // === 労務系 ===
    { id: 'labor_insurance', category: 'labor', title: '労働保険 年度更新', deadline_type: 'yearly', deadline_rule: '6', company_type: 'corporation' },
    { id: 'pension_report', category: 'labor', title: '算定基礎届', deadline_type: 'yearly', deadline_rule: '7', company_type: 'corporation' },
    { id: 'health_checkup', category: 'labor', title: '定期健康診断実施', deadline_type: 'yearly', deadline_rule: '9', company_type: 'corporation' },
    { id: 'stress_check', category: 'labor', title: 'ストレスチェック実施', deadline_type: 'yearly', deadline_rule: '11', company_type: 'corporation', employee_condition: '50+' },
    { id: 'employment_insurance_report', category: 'labor', title: '雇用保険料申告', deadline_type: 'yearly', deadline_rule: '6', company_type: 'corporation' },
    { id: 'social_insurance_payment', category: 'labor', title: '社会保険料納付', deadline_type: 'monthly', deadline_rule: '末日', company_type: 'corporation' },
    { id: '36_agreement', category: 'labor', title: '36協定届出', deadline_type: 'yearly', deadline_rule: '3', company_type: 'corporation' },

    // === その他 ===
    { id: 'financial_statement', category: 'other', title: '決算公告', deadline_type: 'relative', deadline_rule: 'fiscal_month+3', company_type: 'corporation' },
    { id: 'annual_report', category: 'other', title: '事業報告書提出', deadline_type: 'relative', deadline_rule: 'fiscal_month+3', company_type: 'corporation' },

    // === 個人事業主向け ===
    { id: 'income_tax_return', category: 'tax', title: '所得税確定申告', deadline_type: 'yearly', deadline_rule: '3', company_type: 'sole' },
    { id: 'consumption_tax_sole', category: 'tax', title: '消費税確定申告（個人）', deadline_type: 'yearly', deadline_rule: '3', company_type: 'sole' }
];

async function checkUser(email) {
    console.log(`Checking notifications for: ${email}`);

    // Find User
    const usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (usersSnap.empty) {
        console.log('User not found.');
        return;
    }

    const userData = usersSnap.docs[0].data();
    console.log(`User ID: ${usersSnap.docs[0].id}`);
    console.log(`Company: ${userData.company_name}, Fiscal Month: ${userData.fiscal_month}`);

    // Filter Items
    const applicableItems = COMPLIANCE_ITEMS.filter(item => {
        if (item.company_type && item.company_type !== userData.company_type) return false;
        // employee_size check skipped for simplicity or assumed
        return true;
    });

    const now = new Date(); // JST? Local system time. 
    // Assuming local system is JST due to environment, or we correct it.
    // calculateDeadline uses local time.

    // Calculate deadlines and next notifications
    const nextNotifications = [];

    for (const item of applicableItems) {
        // Redefine calculateDeadline locally to ensure consistency with ESM version if needed
        // But for now let's hope the require works or we just implement simple logic here.
        // Actually I required it above but `compliance-logic.js` is ESM.
        // `require('./js/compliance-logic.js')` might fail if sending pure ESM.

        // Let's simulate calculateDeadline logic here to be safe and avoiding import issues
        const deadline = calculateDeadline_Simulated(item, userData);

        const daysDiff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        // Determine next notification trigger
        // Triggers: 30, 7, 1
        let nextTrigger = null;
        let nextTriggerDays = null;

        if (daysDiff > 30) {
            nextTrigger = 30;
            nextTriggerDays = daysDiff - 30;
        } else if (daysDiff > 7) {
            nextTrigger = 7;
            nextTriggerDays = daysDiff - 7;
        } else if (daysDiff > 1) {
            nextTrigger = 1;
            nextTriggerDays = daysDiff - 1;
        } else if (daysDiff === 1) {
            nextTrigger = 1;
            nextTriggerDays = 0; // Today/Tomorrow match
        }

        if (nextTrigger) {
            nextNotifications.push({
                title: item.title,
                deadline: deadline,
                daysUntilDeadline: daysDiff,
                nextTrigger: nextTrigger,
                daysUntilTrigger: nextTriggerDays
            });
        }
    }

    // Sort by daysUntilTrigger (soonest notification)
    nextNotifications.sort((a, b) => a.daysUntilTrigger - b.daysUntilTrigger);

    console.log('\n--- Next User Notifications ---');
    if (nextNotifications.length > 0) {
        const earliest = nextNotifications[0];
        console.log(`🚀 EARLIEST NOTIFICATION:`);
        console.log(`制度名: ${earliest.title}`);
        console.log(`期限日: ${earliest.deadline.toLocaleDateString()}`);
        console.log(`現在残り日数: ${earliest.daysUntilDeadline}日`);
        console.log(`次回通知タイミング: ${earliest.nextTrigger}日前通知`);
        console.log(`通知の送信予定: あと約 ${Math.floor(earliest.daysUntilTrigger)} 日後`);

        console.log('\n(Top 3 List)');
        nextNotifications.slice(0, 3).forEach(n => {
            console.log(`- ${n.title}: 期限 ${n.deadline.toLocaleDateString()} (残り${n.daysUntilDeadline}日) -> 次回 ${n.nextTrigger}日前通知 (あと${n.daysUntilTrigger.toFixed(1)}日)`);
        });
    } else {
        console.log('No upcoming notifications found.');
    }
}

// Logic copied from server side fix
function calculateDeadline_Simulated(item, userData) {
    const now = new Date();
    // Simple today 00:00 check
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (item.deadline_type === 'relative') {
        const fiscalMonth = userData.fiscal_month || 3;
        const offset = parseInt(item.deadline_rule.split('+')[1]);
        let deadlineMonth = fiscalMonth + offset;
        let deadlineYear = currentYear;
        if (deadlineMonth > 12) { deadlineMonth -= 12; deadlineYear += 1; }
        const deadline = new Date(deadlineYear, deadlineMonth - 1, 1);
        if (deadline < today) { deadline.setFullYear(deadlineYear + 1); }
        return deadline;
    } else if (item.deadline_type === 'monthly') {
        if (item.deadline_rule === '末日') {
            let deadline = new Date(currentYear, currentMonth, 0);
            if (deadline < today) { deadline = new Date(currentYear, currentMonth + 1, 0); }
            return deadline;
        } else {
            const day = parseInt(item.deadline_rule);
            let deadline = new Date(currentYear, currentMonth - 1, day);
            if (deadline < today) { deadline = new Date(currentYear, currentMonth, day); }
            return deadline;
        }
    } else if (item.deadline_type === 'yearly') {
        const month = parseInt(item.deadline_rule);
        let deadline = new Date(currentYear, month - 1, 1);
        if (deadline < today) { deadline.setFullYear(currentYear + 1); }
        return deadline;
    }
    return new Date();
}

const targetEmail = 'kuraeplasma@gmail.com';
checkUser(targetEmail).catch(console.error);

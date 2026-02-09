const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Firebase初期化
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();

// SendGrid初期化
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ダッシュボードURL
// ダッシュボードURL（本番固定）
const DASHBOARD_URL = 'https://merki.spacegleam.co.jp/dashboard.html';

// メールテンプレート
const EMAIL_TEMPLATES = {
    30: {
        subject: '【MERKI】{{regulationName}}の期限まで、あと30日です',
        body: `{{companyName}}

MERKIからのご連絡です。

{{regulationName}}の期限が、約30日後に近づいています。

■ 制度名：{{regulationName}}
■ 期限日：{{deadlineDate}}

現時点で対応いただく必要はありませんが、
この時期に一度ご確認いただくことで、
今後の予定が立てやすくなります。

必要な対応がある場合は、
ご自身のタイミングでご準備ください。

▼ ダッシュボードはこちら
${DASHBOARD_URL}

――
MERKI
https://merki.spacegleam.co.jp/`
    },
    7: {
        subject: '【MERKI】{{regulationName}}の期限まで、あと7日です',
        body: `{{companyName}}

MERKIからのご連絡です。

{{regulationName}}の期限が、1週間後に迫っています。

■ 制度名：{{regulationName}}
■ 期限日：{{deadlineDate}}

対応が必要な制度の場合は、
このタイミングで準備状況をご確認ください。

期限直前にも、あらためてお知らせいたします。

▼ ダッシュボードはこちら
${DASHBOARD_URL}

――
MERKI
https://merki.spacegleam.co.jp/`
    },
    1: {
        subject: '【MERKI】{{regulationName}}の期限は明日です',
        body: `{{companyName}}

MERKIからのご連絡です。

{{regulationName}}の期限は、明日となっています。

■ 制度名：{{regulationName}}
■ 期限日：{{deadlineDate}}

すでに対応済みの場合は、
本メールは読み流していただいて問題ありません。

未対応の場合は、
お時間の許す範囲でご確認ください。

▼ ダッシュボードはこちら
${DASHBOARD_URL}

――
MERKI
https://merki.spacegleam.co.jp/`
    }
};

// 制度マスタデータ
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
    { id: 'consumption_tax_sole', category: 'tax', title: '消費税確定申告（個人）', deadline_type: 'yearly', deadline_rule: '3', company_type: 'sole' },
];

exports.handler = async function (event, context) {
    try {
        console.log('Starting notification check...');

        if (!process.env.SENDGRID_API_KEY) {
            console.error('SENDGRID_API_KEY is not configured');
            return { statusCode: 500, body: 'SendGrid API key missing' };
        }

        const now = new Date();
        // JST変換 (UTC+9)
        const jstOffset = 9 * 60;
        const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + jstOffset) * 60000);
        const today = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());

        // アクティブユーザー取得（active または trial）
        const usersSnapshot = await db.collection('users')
            .where('subscription_status', 'in', ['active', 'trial'])
            .get();

        if (usersSnapshot.empty) {
            console.log('No active/trial users found');
            return { statusCode: 200, body: 'No active users' };
        }

        let notificationCount = 0;
        let errorCount = 0;

        // 各ユーザーの該当制度をチェック
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userEmail = userData.email;

            // 宛名フォーマット生成
            // 法人: 「法人名様　氏名様」
            // 個人（屋号あり）: 「屋号様　氏名様」
            // 個人（屋号なし）: 「氏名様」
            let recipientName;
            const companyType = userData.company_type;
            const contactName = userData.contact_name || '';

            if (companyType === 'corporation') {
                // 法人の場合: 法人名様　氏名様
                const corpName = userData.company_name || '';
                if (corpName && contactName) {
                    recipientName = `${corpName}様　${contactName}様`;
                } else if (corpName) {
                    recipientName = `${corpName}様`;
                } else if (contactName) {
                    recipientName = `${contactName}様`;
                } else {
                    recipientName = 'お客様';
                }
            } else if (companyType === 'sole') {
                // 個人事業主の場合: 屋号様　氏名様 または 氏名様
                const shopName = userData.shop_name || '';
                if (shopName && contactName) {
                    recipientName = `${shopName}様　${contactName}様`;
                } else if (contactName) {
                    recipientName = `${contactName}様`;
                } else if (shopName) {
                    recipientName = `${shopName}様`;
                } else {
                    recipientName = 'お客様';
                }
            } else {
                // 未設定の場合
                if (contactName) {
                    recipientName = `${contactName}様`;
                } else if (userData.company_name) {
                    recipientName = `${userData.company_name}様`;
                } else {
                    recipientName = 'お客様';
                }
            }

            const companyName = recipientName;

            if (!userEmail) {
                console.log(`Skipping user ${userDoc.id}: no email`);
                continue;
            }

            // 該当制度を抽出
            const applicableRegulations = getApplicableCompliances(userData);

            // 各制度の期限をチェック
            for (const reg of applicableRegulations) {
                try {
                    // 1. 制度ON/OFFチェック（Proプラン限定設定）
                    // userData.disabled_regulations 配列に制度IDが含まれていればスキップ
                    const disabledRegs = userData.disabled_regulations || [];
                    if (disabledRegs.includes(reg.id)) {
                        console.log(`Skipping disabled regulation ${reg.id} for user ${userDoc.id}`);
                        continue;
                    }

                    const deadline = calculateDeadline(reg, userData);
                    const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

                    // 2. プラン別の通知タイミング制御
                    // Pro/Trial: 30, 7, 1日前
                    // Standard: 7, 1日前
                    // Lite: 1日前のみ
                    const userPlan = userData.subscription_plan || userData.plan || 'pro';
                    const isTrial = userData.subscription_status === 'trial';

                    // 通知時間設定 (日数: 時)
                    // 30日前 -> 11:00
                    // 7日前 -> 10:00
                    // 1日前 -> 9:00
                    const NOTIFICATION_TIMES = {
                        30: 11,
                        7: 10,
                        1: 9
                    };

                    let shouldNotifyThisDay = false;
                    if (userPlan === 'pro' || isTrial) {
                        shouldNotifyThisDay = [30, 7, 1].includes(daysUntilDeadline);
                    } else if (userPlan === 'standard') {
                        shouldNotifyThisDay = [7, 1].includes(daysUntilDeadline);
                    } else if (userPlan === 'lite') {
                        shouldNotifyThisDay = (daysUntilDeadline === 1);
                    }

                    // 時間チェック
                    if (shouldNotifyThisDay) {
                        const currentHour = jstNow.getHours();
                        const targetHour = NOTIFICATION_TIMES[daysUntilDeadline] || 9; // デフォルト9時

                        // 時間が一致しない場合はスキップ (ローカルテスト用環境変数がある場合は無視)
                        if (currentHour !== targetHour && !process.env.IGNORE_NOTIFICATION_TIME) {
                            // console.log(`Skipping ${reg.title} for ${userEmail}: Current ${currentHour}h != Target ${targetHour}h`);
                            continue;
                        }

                        // 重複チェック
                        const notificationId = `${userDoc.id}_${reg.id}_${deadline.getTime()}_${daysUntilDeadline}days`;
                        const existingNotification = await db.collection('notifications')
                            .doc(notificationId)
                            .get();

                        if (!existingNotification.exists) {
                            // メール送信
                            await sendNotificationEmail(
                                userEmail,
                                companyName,
                                reg.title,
                                deadline,
                                daysUntilDeadline,
                                userData // Pass full data to access custom_templates
                            );

                            // 通知履歴保存
                            await db.collection('notifications').doc(notificationId).set({
                                user_id: userDoc.id,
                                user_email: userEmail,
                                regulation_id: reg.id,
                                regulation_name: reg.title,
                                notification_type: `${daysUntilDeadline}days`,
                                deadline_date: deadline,
                                sent_at: admin.firestore.FieldValue.serverTimestamp()
                            });

                            notificationCount++;
                            console.log(`Sent ${daysUntilDeadline}-day notification to ${userEmail} for ${reg.title}`);
                        }
                    }
                } catch (regError) {
                    console.error(`Error processing regulation ${reg.id} for user ${userDoc.id}:`, regError);
                    errorCount++;
                }
            }
        }

        console.log(`Completed: Sent ${notificationCount} notifications, ${errorCount} errors`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                sent: notificationCount,
                errors: errorCount
            })
        };

    } catch (error) {
        console.error('Notification error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

// 該当制度を判定
function getApplicableCompliances(userData) {
    const { company_type, industry, employee_size } = userData;

    return COMPLIANCE_ITEMS.filter(item => {
        // 会社種別チェック
        if (item.company_type && item.company_type !== company_type) {
            return false;
        }

        // 業種チェック
        if (item.industry && item.industry !== industry) {
            return false;
        }

        // 従業員数チェック
        if (item.employee_condition && item.employee_condition !== employee_size) {
            return false;
        }

        return true;
    });
}

// 期限計算
function calculateDeadline(item, userData) {
    const now = new Date();

    // JST変換 (UTC+9)
    const jstOffset = 9 * 60;
    const jstNow = new Date(now.getTime() + (now.getTimezoneOffset() + jstOffset) * 60000);

    // JSTでの「今日」の00:00:00
    const today = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());

    const currentYear = jstNow.getFullYear();
    const currentMonth = jstNow.getMonth() + 1;

    if (item.deadline_type === 'relative') {
        // 決算月ベース（例：決算月+2ヶ月）
        const fiscalMonth = userData.fiscal_month || 3;
        const offset = parseInt(item.deadline_rule.split('+')[1]);

        let deadlineMonth = fiscalMonth + offset;
        let deadlineYear = currentYear;

        if (deadlineMonth > 12) {
            deadlineMonth -= 12;
            deadlineYear += 1;
        }

        const deadline = new Date(deadlineYear, deadlineMonth - 1, 1);

        // 過去の日付（昨日以前）の場合は翌年
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

    } else if (item.deadline_type === 'yearly') {
        const month = parseInt(item.deadline_rule);
        let deadline = new Date(currentYear, month - 1, 1);

        if (deadline < today) {
            deadline.setFullYear(currentYear + 1);
        }

        return deadline;

    } else if (item.deadline_type === 'event_based') {
        return new Date(currentYear, currentMonth, 1);
    }

    return new Date();
}

// 通知メール送信（SendGrid）
async function sendNotificationEmail(toEmail, companyName, regulationName, deadline, daysLeft, userData = {}) {
    // Default Template
    let template = EMAIL_TEMPLATES[daysLeft];

    // Check for Custom Template in UserData
    // Structure: userData.custom_templates[regulationId][daysLeft].note
    // We only allow customizing the "note" part in the dashboard, but here we might store full body or parts.
    // Based on dashboard.html: window.currentUserData.custom_templates[id][days].note

    // Reconstruct body if custom note exists
    if (userData.custom_templates) {
        // Find regulation ID that matches regulationName (Reverse lookup or pass ID)
        // Optimization: Pass regulationId to this function instead of Name, or find it.
        // Let's look up the ID from COMPLIANCE_ITEMS based on title 
        const regItem = COMPLIANCE_ITEMS.find(i => i.title === regulationName);
        if (regItem && userData.custom_templates[regItem.id] && userData.custom_templates[regItem.id][daysLeft]) {
            const customNote = userData.custom_templates[regItem.id][daysLeft].note;
            if (customNote) {
                // Re-assemble body with custom note
                // Note: The original template structure in dashboard.html implies the user edits the "main message".
                // We need to inject this custom note into the body.
                // Current hardcoded body doesn't easily split. 
                // STRATEGY: If custom note exists, we use a generic structure swapping the middle part.

                // However, the current dashboard saves "note". 
                // Let's look at the default templates in this file. They are full strings.
                // We should probably update the EMAIL_TEMPLATES to be composed of parts if we want to inject, 
                // OR (Simpler for now) we assume the dashboard saves the *entire* message or we intelligently replace.

                // Let's assume the user wants to replace the main textual content.
                // Matches format in dashboard.html DEFAULT_TEMPLATES

                const baseIntro = {
                    30: `{{regulationName}}の期限が、約30日後に近づいています。`,
                    7: `{{regulationName}}の期限が、1週間後に迫っています。`,
                    1: `{{regulationName}}の期限は、明日となっています。`
                }[daysLeft];

                // Construct new body with Custom Note
                const newBody = `{{companyName}}

MERKIからのご連絡です。

${baseIntro}

■ 制度名：{{regulationName}}
■ 期限日：{{deadlineDate}}

${customNote}

▼ ダッシュボードはこちら
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://merki.spacegleam.co.jp/`;

                // Override template used
                template = {
                    subject: template.subject, // Keep subject same
                    body: newBody
                };
            }
        }
    }

    if (!template) {
        console.error(`No template found for ${daysLeft} days`);
        return;
    }

    // Date Format
    const deadlineDate = deadline.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Replace Variables
    const subject = template.subject
        .replace(/\{\{regulationName\}\}/g, regulationName);

    const body = template.body
        .replace(/\{\{companyName\}\}/g, companyName)
        .replace(/\{\{regulationName\}\}/g, regulationName)
        .replace(/\{\{deadlineDate\}\}/g, deadlineDate);

    const msg = {
        to: toEmail,
        from: {
            email: process.env.SENDGRID_FROM_EMAIL || 'noreply@merki.jp',
            name: 'MERKI'
        },
        subject: subject,
        text: body,
        trackingSettings: {
            clickTracking: {
                enable: false
            }
        }
    };

    try {
        await sgMail.send(msg);
        console.log(`Email sent to ${toEmail} for ${regulationName} (${daysLeft} days)`);
    } catch (error) {
        console.error('SendGrid error:', error.response?.body || error.message);
        throw error;
    }
}

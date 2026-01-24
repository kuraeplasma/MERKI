const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

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

exports.handler = async function (event, context) {
    try {
        console.log('Starting notification check...');

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // アクティブユーザー取得
        const usersSnapshot = await db.collection('users')
            .where('subscription_status', '==', 'active')
            .get();

        if (usersSnapshot.empty) {
            console.log('No active users found');
            return { statusCode: 200, body: 'No active users' };
        }

        // 制度マスタ取得
        const regulationsSnapshot = await db.collection('regulations').get();
        const regulations = [];
        regulationsSnapshot.forEach(doc => {
            regulations.push({ id: doc.id, ...doc.data() });
        });

        let notificationCount = 0;

        // 各ユーザーの該当制度をチェック
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();

            // 該当制度を抽出
            const applicableRegulations = regulations.filter(reg =>
                isApplicable(reg, userData)
            );

            // 各制度の期限をチェック
            for (const reg of applicableRegulations) {
                const deadline = calculateDeadline(reg);
                const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

                // 30日前、7日前、前日に通知
                if (daysUntilDeadline === 30 || daysUntilDeadline === 7 || daysUntilDeadline === 1) {
                    // 重複チェック
                    const notificationId = `${userDoc.id}_${reg.id}_${deadline.getTime()}_${daysUntilDeadline}days`;
                    const existingNotification = await db.collection('notifications')
                        .doc(notificationId)
                        .get();

                    if (!existingNotification.exists) {
                        // メール送信
                        await sendNotificationEmail(
                            userData.email,
                            reg.name,
                            deadline,
                            daysUntilDeadline
                        );

                        // 通知履歴保存
                        await db.collection('notifications').doc(notificationId).set({
                            user_id: userDoc.id,
                            regulation_id: reg.id,
                            regulation_name: reg.name,
                            notification_type: `${daysUntilDeadline}days`,
                            deadline_date: deadline,
                            sent_at: admin.firestore.FieldValue.serverTimestamp()
                        });

                        notificationCount++;
                    }
                }
            }
        }

        console.log(`Sent ${notificationCount} notifications`);
        return { statusCode: 200, body: `Sent ${notificationCount} notifications` };

    } catch (error) {
        console.error('Notification error:', error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};

// 該当判定
function isApplicable(regulation, userData) {
    if (regulation.applicable_company_types?.length > 0) {
        if (!regulation.applicable_company_types.includes(userData.company_type)) {
            return false;
        }
    }

    if (regulation.applicable_industries?.length > 0) {
        if (!regulation.applicable_industries.includes(userData.industry)) {
            return false;
        }
    }

    if (regulation.applicable_employee_ranges?.length > 0) {
        if (!regulation.applicable_employee_ranges.includes(userData.employee_count)) {
            return false;
        }
    }

    return true;
}

// 期限計算
function calculateDeadline(regulation) {
    const now = new Date();
    const currentYear = now.getFullYear();

    if (regulation.deadline_type === 'annual') {
        const deadline = new Date(currentYear, regulation.deadline_month - 1, regulation.deadline_day);
        if (deadline < now) {
            deadline.setFullYear(currentYear + 1);
        }
        return deadline;
    }

    // 月次の場合
    const deadline = new Date(currentYear, now.getMonth() + 1, regulation.deadline_day);
    return deadline;
}

// 通知メール送信
async function sendNotificationEmail(toEmail, regulationName, deadline, daysLeft) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP config missing. Skipping email.');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const urgencyLevel = daysLeft === 1 ? '【緊急】' : daysLeft === 7 ? '【重要】' : '';

    const mailOptions = {
        from: `"コンプラナビ" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `${urgencyLevel}【コンプラナビ】制度期限通知: ${regulationName}`,
        text: `
${regulationName}の期限が近づいています。

■ 期限日
${deadline.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}

■ 残り日数
あと${daysLeft}日

■ ご注意
本サービスは期限の通知を行うものであり、法的助言や申請代行を行うものではありません。
実際の申請期限や必要書類については、必ず公式機関にご確認ください。

■ マイページ
https://compliancenavi.spacegleam.co.jp/dashboard.html

コンプラナビ運営チーム
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Notification email sent to: ${toEmail} for ${regulationName}`);
    } catch (error) {
        console.error('Email send error:', error);
    }
}

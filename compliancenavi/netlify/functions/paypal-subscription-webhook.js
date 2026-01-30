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
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const eventType = body.event_type;

        console.log('Received webhook:', eventType);

        // サブスクリプション有効化
        if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const subscriptionId = body.resource.id;
            const subscriberEmail = body.resource.subscriber?.email_address;

            if (!subscriberEmail) {
                return { statusCode: 400, body: 'No subscriber email' };
            }

            // ユーザー検索
            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('email', '==', subscriberEmail).get();

            if (snapshot.empty) {
                console.log('User not found:', subscriberEmail);
                return { statusCode: 404, body: 'User not found' };
            }

            // ステータス更新
            const userDoc = snapshot.docs[0];
            await userDoc.ref.update({
                subscription_status: 'active',
                subscription_id: subscriptionId,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('Subscription activated for:', subscriberEmail);

            // ウェルカムメール送信
            await sendWelcomeEmail(subscriberEmail);

            return { statusCode: 200, body: 'Subscription activated' };
        }

        // サブスクリプションキャンセル
        if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
            const subscriptionId = body.resource.id;

            // サブスクリプションIDでユーザー検索
            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('subscription_id', '==', subscriptionId).get();

            if (snapshot.empty) {
                console.log('User not found for subscription:', subscriptionId);
                return { statusCode: 404, body: 'User not found' };
            }

            // ステータス更新
            const userDoc = snapshot.docs[0];
            await userDoc.ref.update({
                subscription_status: 'canceled',
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log('Subscription canceled for:', userDoc.data().email);

            return { statusCode: 200, body: 'Subscription canceled' };
        }

        return { statusCode: 200, body: 'Event ignored' };

    } catch (error) {
        console.error('Webhook error:', error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};

// ウェルカムメール送信
async function sendWelcomeEmail(toEmail) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP config missing. Skipping email.');
        return;
    }

    const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: `"MERKI" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: '【MERKI】ご登録ありがとうございます',
        text: `
MERKIにご登録いただき、ありがとうございます。

これより、制度期限の自動通知サービスをご利用いただけます。

■ ご利用方法
1. プロフィール設定で会社情報を登録
2. ダッシュボードで該当する制度を確認
3. 期限の30日前・7日前・前日にメール通知

■ マイページ
https://compliancenavi.spacegleam.co.jp/dashboard.html

ご不明な点がございましたら、このメールに返信してください。

MERKI運営チーム
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', toEmail);
    } catch (error) {
        console.error('Email send error:', error);
    }
}

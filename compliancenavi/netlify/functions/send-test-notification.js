const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Firebase初期化関数
function initializeFirebase() {
    if (admin.apps.length) return;

    if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.error('FIREBASE_PRIVATE_KEY is missing');
        throw new Error('Firebase Private Key missing');
    }

    // 秘密鍵のフォーマットを補正（Netlify環境変数での不整合対策）
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // 1. 前後の引用符を削除
    privateKey = privateKey.replace(/^["']|["']$/g, '');

    // 2. リテラルの \n を実際の改行に変換
    privateKey = privateKey.replace(/\\n/g, '\n');

    // 3. すでに改行されている場合、二重に改行コードが含まれないように調整
    // (特定の環境での重複防止)

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
        })
    });
}

try {
    initializeFirebase();
} catch (e) {
    console.error('Firebase initialization failed:', e.message);
}

const db = admin.firestore();

// SendGrid初期化
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ダッシュボードURL
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

▼ 制度の詳細・一覧はこちら
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://merki.spacegleam.co.jp`
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

▼ 制度の詳細・一覧はこちら
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://merki.spacegleam.co.jp`
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

▼ 制度の詳細・一覧はこちら
${DASHBOARD_URL}

――
MERKI
運営：SpaceGleam株式会社
https://merki.spacegleam.co.jp`
    }
};

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userId, daysType } = JSON.parse(event.body || '{}');

        if (!userId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };
        }

        // ユーザー情報を取得
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
        }

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
            return { statusCode: 400, body: JSON.stringify({ error: 'User has no email' }) };
        }

        // テスト用のサンプル制度
        const sampleRegulation = '法人税申告';
        const days = parseInt(daysType) || 30;

        // 期限日を計算（テスト用：今日から指定日数後）
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + days);

        const template = EMAIL_TEMPLATES[days];
        if (!template) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid daysType. Use 30, 7, or 1' }) };
        }

        // 日付フォーマット
        const deadlineDate = deadline.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // テンプレート変数の置換
        const subject = template.subject
            .replace(/\{\{regulationName\}\}/g, sampleRegulation);

        const body = template.body
            .replace(/\{\{companyName\}\}/g, companyName)
            .replace(/\{\{regulationName\}\}/g, sampleRegulation)
            .replace(/\{\{deadlineDate\}\}/g, deadlineDate);

        const msg = {
            to: userEmail,
            from: {
                email: 'contact@spacegleam.co.jp',
                name: 'MERKI'
            },
            subject: subject,
            text: body,
        };

        await sgMail.send(msg);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: `${days}日前通知テンプレートを ${userEmail} に送信しました`,
                sentTo: userEmail,
                companyName: companyName,
                template: `${days}日前`
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to send notification',
                details: error.message
            })
        };
    }
};

const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Firebase初期化関数
function initializeFirebase() {
    if (admin.apps.length) return;

    if (!process.env.FIREBASE_PRIVATE_KEY) {
        throw new Error('FIREBASE_PRIVATE_KEY が環境変数に設定されていません。');
    }

    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // 1. JSON全体が貼り付けられている場合の救済措置
    try {
        if (privateKey.trim().startsWith('{')) {
            const config = JSON.parse(privateKey);
            if (config.private_key) {
                privateKey = config.private_key;
            }
        }
    } catch (e) { /* JSONではない場合は無視 */ }

    // 2. 引用符の除去
    privateKey = privateKey.replace(/^["']|["']$/g, '').trim();

    // 3. 改行コード（\n）の変換
    privateKey = privateKey.replace(/\\n/g, '\n');

    // 4. 改行が全くない場合の補正（ヘッダーとフッターを独立させる）
    if (!privateKey.includes('\n')) {
        privateKey = privateKey
            .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
            .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    }

    // 5. 最終チェック
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('秘密鍵の形式が不正です（BEGINヘッダーが見つかりません）。Netlifyの設定を確認してください。');
    }

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

▼ ダッシュボードはこちらから
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

▼ ダッシュボードはこちらから
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

▼ ダッシュボードはこちらから
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
        let recipientName;
        const companyType = userData.company_type;
        const contactName = userData.contact_name || '';

        if (companyType === 'corporation') {
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

        const bodyText = template.body
            .replace(/\{\{companyName\}\}/g, companyName)
            .replace(/\{\{regulationName\}\}/g, sampleRegulation)
            .replace(/\{\{deadlineDate\}\}/g, deadlineDate);

        // HTMLボディの作成（リンクを短く見せるため）
        const bodyHtml = bodyText
            .replace(/\n/g, '<br>')
            .replace(DASHBOARD_URL, `<a href="${DASHBOARD_URL}">${DASHBOARD_URL}</a>`)
            .replace('https://merki.spacegleam.co.jp', `<a href="https://merki.spacegleam.co.jp">https://merki.spacegleam.co.jp</a>`);

        const msg = {
            to: userEmail,
            from: {
                email: 'merki@spacegleam.co.jp',
                name: 'MERKI'
            },
            subject: subject,
            text: bodyText,
            html: bodyHtml
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

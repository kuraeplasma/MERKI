const sgMail = require('@sendgrid/mail');

exports.handler = async function (event, context) {
    // POST のみ許可
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // API キー確認
    if (!process.env.SENDGRID_API_KEY) {
        console.error('SENDGRID_API_KEY is not configured');
        return { statusCode: 500, body: JSON.stringify({ error: 'SendGrid API key missing' }) };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // リクエストから宛先を取得（オプション）
    let toEmail = 'contact@spacegleam.co.jp'; // デフォルト
    try {
        if (event.body) {
            const body = JSON.parse(event.body);
            if (body.to) toEmail = body.to;
        }
    } catch (e) {
        // パース失敗時はデフォルトを使用
    }

    const msg = {
        to: toEmail,
        from: {
            email: 'contact@spacegleam.co.jp',
            name: 'MERKI'
        },
        subject: '【MERKI】SendGrid テストメール',
        text: `これはMERKIからのテストメールです。

SendGridとの連携が正常に動作しています。

送信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

――
MERKI
運営：SpaceGleam株式会社
https://merki.jp`
    };

    try {
        await sgMail.send(msg);
        console.log(`Test email sent to ${toEmail}`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: `Test email sent to ${toEmail}`
            })
        };
    } catch (error) {
        console.error('SendGrid error:', error.response?.body || error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to send email',
                details: error.response?.body?.errors || error.message
            })
        };
    }
};

const nodemailer = require('nodemailer');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { email, role, senderName, senderEmail } = JSON.parse(event.body);

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('SMTP config missing');
        return { statusCode: 500, body: 'Email configuration missing on server.' };
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

    const mailOptions = {
        from: `"MERKI" <${process.env.SMTP_user || process.env.SMTP_USER}>`,
        to: email,
        subject: `【MERKI】チームへの招待が届きました`,
        text: `
${senderName} (${senderEmail}) さんから、MERKIのチームへの招待が届きました。

■ 権限
${role === 'admin' ? '管理者' : role === 'editor' ? '編集者' : '閲覧者'}

以下のリンクから登録・ログインしてチームに参加してください。
https://compliancenavi.spacegleam.co.jp/

MERKI運営チーム
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { statusCode: 200, body: JSON.stringify({ message: 'Invitation sent' }) };
    } catch (error) {
        console.error('Email send error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email' }) };
    }
};

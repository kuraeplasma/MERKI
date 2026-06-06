'use strict';

const RESEND_API_URL = 'https://api.resend.com/emails';
const TO_EMAIL = process.env.CONTACT_NOTIFY_EMAIL || 'contact@spacegleam.co.jp';
const FROM_EMAIL = process.env.MAIL_FROM || 'noreply@send.spacegleam.co.jp';
const BASIC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify(body)
    };
}

function clean(value, maxLength) {
    return String(value || '')
        .replace(/\0/g, '')
        .replace(/\r\n/g, '\n')
        .trim()
        .slice(0, maxLength);
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

async function verifyRecaptcha(token) {
    const secret = clean(process.env.RECAPTCHA_SECRET_KEY, 240);
    if (!secret) return true;
    if (!token) return false;

    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });
    const result = await response.json();
    return Boolean(result.success && (typeof result.score !== 'number' || result.score >= 0.5));
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return json(204, {});
    }

    if (event.httpMethod !== 'POST') {
        return json(405, { success: false, message: 'Method Not Allowed' });
    }

    try {
        const body = JSON.parse(event.body || '{}');

        if (clean(body.website, 120)) {
            return json(200, { success: true });
        }

        const company = clean(body.company, 120);
        const name = clean(body.name, 80);
        const email = clean(body.email, 160).toLowerCase();
        const category = clean(body.category || 'AI MVP開発・無料相談', 80);
        const subject = clean(body.subject || 'SPACE GLEAM 無料相談', 160);
        const message = clean(body.message, 3000);
        const budget = clean(body.budget, 80);
        const deadline = clean(body.deadline, 80);
        const meeting = clean(body.meeting, 120);
        const bookingUrl = clean(body.bookingUrl, 500);
        const referrer = clean(body.referrer, 120);
        const source = clean(body.source || 'spacegleam-corp', 80);
        const recaptchaToken = clean(body.recaptchaToken, 1200);

        const errors = {};
        if (!company) errors.company = '会社名を入力してください。';
        if (!name) errors.name = 'お名前を入力してください。';
        if (!BASIC_EMAIL_RE.test(email)) errors.email = 'メールアドレスを正しく入力してください。';

        if (Object.keys(errors).length) {
            return json(400, { success: false, message: '入力内容を確認してください。', errors });
        }

        if (!(await verifyRecaptcha(recaptchaToken))) {
            return json(400, { success: false, message: 'スパム判定により送信できませんでした。時間をおいて再度お試しください。' });
        }

        const apiKey = clean(process.env.RESEND_API_KEY, 240);
        if (!apiKey) {
            return json(500, { success: false, message: 'メール送信設定が未完了です。時間をおいて再度お試しください。' });
        }

        const text = [
            'SPACE GLEAM コーポレートサイトから無料相談が届きました。',
            '',
            `会社名: ${company}`,
            `お名前: ${name}`,
            `メール: ${email}`,
            `種別: ${category}`,
            `件名: ${subject}`,
            `予算感: ${budget || '未選択'}`,
            `希望納期: ${deadline || '未選択'}`,
            `商談予約: ${meeting || '未選択'}${bookingUrl ? ` (日程調整URL: ${bookingUrl})` : ''}`,
            `認知経路: ${referrer || '未選択'}`,
            `送信元: ${source}`,
            '',
            '相談内容:',
            message || '未入力'
        ].join('\n');

        const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:'Noto Sans JP','Inter','Hiragino Sans','Yu Gothic','Meiryo',sans-serif;color:#06163b;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f5f7fb;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #dbe6f5;border-radius:14px;overflow:hidden;">
<tr><td style="background:#050509;color:#fff;padding:20px 28px;font-weight:800;font-size:18px;">SPACE GLEAM 無料相談</td></tr>
<tr><td style="padding:28px;">
<p><strong>会社名:</strong> ${escapeHtml(company)}</p>
<p><strong>お名前:</strong> ${escapeHtml(name)}</p>
<p><strong>メール:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
<p><strong>種別:</strong> ${escapeHtml(category)}</p>
<p><strong>件名:</strong> ${escapeHtml(subject)}</p>
<p><strong>予算感:</strong> ${escapeHtml(budget || '未選択')}</p>
<p><strong>希望納期:</strong> ${escapeHtml(deadline || '未選択')}</p>
<p><strong>商談予約:</strong> ${escapeHtml(meeting || '未選択')}${bookingUrl ? ` (<a href="${escapeHtml(bookingUrl)}" target="_blank" style="color: #4f6df5; font-weight: bold;">日程調整カレンダー</a>)` : ''}</p>
<p><strong>認知経路:</strong> ${escapeHtml(referrer || '未選択')}</p>
<div style="margin-top:22px;padding:18px;border-radius:12px;background:#f8fbff;border:1px solid #e1ebf8;white-space:pre-wrap;line-height:1.8;">${escapeHtml(message || '未入力')}</div>
</td></tr></table></td></tr></table></body></html>`;

        const resendResponse = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [TO_EMAIL],
                reply_to: email,
                subject: `【SPACE GLEAM】無料相談: ${subject}`,
                html,
                text
            })
        });

        const resendResult = await resendResponse.json().catch(() => null);
        if (!resendResponse.ok || resendResult?.error) {
            return json(500, { success: false, message: '送信に失敗しました。時間をおいて再度お試しください。' });
        }

        return json(200, { success: true, message: 'お問い合わせを受け付けました。確認のうえご連絡します。' });
    } catch (error) {
        return json(500, { success: false, message: '送信に失敗しました。時間をおいて再度お試しください。' });
    }
};

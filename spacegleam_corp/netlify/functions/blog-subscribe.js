'use strict';

const RESEND_API_URL = 'https://api.resend.com';
const FROM_EMAIL = process.env.MAIL_FROM || 'SPACE GLEAM <noreply@send.spacegleam.co.jp>';
const ADMIN_EMAIL = process.env.CONTACT_NOTIFY_EMAIL || 'contact@spacegleam.co.jp';
const BLOG_SEGMENT_ID = process.env.RESEND_BLOG_SEGMENT_ID || '';
const BLOG_SEGMENT_NAME = process.env.RESEND_BLOG_SEGMENT_NAME || 'SPACE GLEAM Blog Subscribers';
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

function welcomeEmailHtml(email) {
    return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Noto Sans JP','Hiragino Sans','Yu Gothic','Meiryo',Arial,sans-serif;color:#111;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 14px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #232323;">
<tr><td style="padding:42px 42px 30px;background:linear-gradient(135deg,#050505,#171717);color:#fff;">
<p style="margin:0 0 18px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b8bec5;">SPACE GLEAM BLOG</p>
<h1 style="margin:0;font-size:28px;line-height:1.45;letter-spacing:0;">実践知をお届けします。</h1>
<p style="margin:18px 0 0;color:#c7ccd1;line-height:1.9;font-size:14px;">AI開発、SaaS構築、自社サービス運営の中で得た知見を、新しい記事が公開されたタイミングでお送りします。</p>
</td></tr>
<tr><td style="padding:34px 42px;">
<p style="margin:0 0 20px;line-height:1.9;color:#30343a;font-size:15px;">ご登録ありがとうございます。登録メールアドレスは以下です。</p>
<div style="padding:16px 18px;background:#f6f7f8;border:1px solid #e4e6e8;border-radius:12px;font-weight:700;color:#111;">${escapeHtml(email)}</div>
<a href="https://spacegleam.co.jp/blog/" style="display:inline-block;margin-top:28px;padding:14px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:800;">ブログを見る →</a>
</td></tr>
<tr><td style="padding:22px 42px;background:#f8f8f8;color:#747b82;font-size:12px;line-height:1.7;">SPACE GLEAM / AIプロダクト開発・自社サービス運営<br>今後の配信停止は、配信メール内の解除リンクから行えます。</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

async function resend(path, payload, apiKey) {
    return fetch(`${RESEND_API_URL}${path}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
}

async function resendGet(path, apiKey) {
    return fetch(`${RESEND_API_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });
}

async function getBlogSegmentId(apiKey) {
    if (BLOG_SEGMENT_ID) return BLOG_SEGMENT_ID;

    const listResponse = await resendGet('/segments', apiKey);
    const listResult = await listResponse.json().catch(() => null);
    if (!listResponse.ok || listResult?.error) {
        throw new Error(listResult?.error?.message || 'Failed to list segments');
    }

    const existing = (listResult?.data || []).find((segment) => segment.name === BLOG_SEGMENT_NAME);
    if (existing?.id) return existing.id;

    const createResponse = await resend('/segments', { name: BLOG_SEGMENT_NAME }, apiKey);
    const createResult = await createResponse.json().catch(() => null);
    if (!createResponse.ok || createResult?.error || !createResult?.id) {
        throw new Error(createResult?.error?.message || 'Failed to create segment');
    }

    return createResult.id;
}

async function addContact(email, apiKey) {
    const segmentId = await getBlogSegmentId(apiKey);

    const contactPayload = {
        email,
        unsubscribed: false,
        properties: {
            source: 'spacegleam-blog',
            registered_at: new Date().toISOString()
        },
        segments: [{ id: segmentId }]
    };

    const contactResponse = await resend('/contacts', contactPayload, apiKey);
    if (contactResponse.ok) return true;
    if (contactResponse.status !== 409) return false;

    const segmentResponse = await resend(`/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`, {}, apiKey);
    return segmentResponse.ok || segmentResponse.status === 409;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return json(204, {});
    if (event.httpMethod !== 'POST') return json(405, { success: false, message: 'Method Not Allowed' });

    try {
        const body = JSON.parse(event.body || '{}');
        if (clean(body.website, 120)) return json(200, { success: true });

        const email = clean(body.email, 160).toLowerCase();
        if (!BASIC_EMAIL_RE.test(email)) {
            return json(400, { success: false, message: 'メールアドレスを正しく入力してください。' });
        }

        const apiKey = clean(process.env.RESEND_API_KEY, 240);
        if (!apiKey) {
            return json(500, { success: false, message: 'メール配信設定が未完了です。' });
        }

        const contactSaved = await addContact(email, apiKey);
        if (!contactSaved) {
            return json(500, { success: false, message: '登録に失敗しました。時間をおいて再度お試しください。' });
        }

        await resend('/emails', {
            from: FROM_EMAIL,
            to: [email],
            subject: 'SPACE GLEAM Blog ご登録ありがとうございます',
            html: welcomeEmailHtml(email),
            text: `SPACE GLEAM Blogへのご登録ありがとうございます。\n登録メールアドレス: ${email}\nhttps://spacegleam.co.jp/blog/`
        }, apiKey);

        await resend('/emails', {
            from: FROM_EMAIL,
            to: [ADMIN_EMAIL],
            subject: '【SPACE GLEAM Blog】メール購読登録',
            html: `<p>ブログ購読登録がありました。</p><p><strong>${escapeHtml(email)}</strong></p>`,
            text: `ブログ購読登録: ${email}`
        }, apiKey);

        return json(200, { success: true, message: '登録しました。確認メールをお送りしました。' });
    } catch (error) {
        console.error('blog-subscribe failed', error);
        return json(500, { success: false, message: '登録に失敗しました。時間をおいて再度お試しください。' });
    }
};

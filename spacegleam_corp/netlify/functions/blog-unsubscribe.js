'use strict';

const crypto = require('crypto');
const RESEND_API_URL = 'https://api.resend.com';

function html(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store'
        },
        body
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

function sign(email, secret) {
    return crypto.createHmac('sha256', secret).update(email).digest('hex');
}

async function updateContact(email, apiKey) {
    return fetch(`${RESEND_API_URL}/contacts/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ unsubscribed: true })
    });
}

exports.handler = async (event) => {
    const email = clean(event.queryStringParameters?.email, 180).toLowerCase();
    const token = clean(event.queryStringParameters?.token, 128);
    const secret = clean(process.env.BLOG_NOTIFY_SECRET, 240);
    const apiKey = clean(process.env.RESEND_API_KEY, 240);

    if (!email || !token || !secret || token !== sign(email, secret)) {
        return html(400, '<!doctype html><meta charset="utf-8"><title>配信停止</title><p>配信停止リンクが無効です。</p>');
    }

    if (!apiKey) {
        return html(500, '<!doctype html><meta charset="utf-8"><title>配信停止</title><p>メール配信設定が未完了です。</p>');
    }

    const response = await updateContact(email, apiKey);
    if (!response.ok && response.status !== 404) {
        return html(500, '<!doctype html><meta charset="utf-8"><title>配信停止</title><p>配信停止に失敗しました。時間をおいて再度お試しください。</p>');
    }

    return html(200, `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>配信停止 | SPACE GLEAM</title></head>
<body style="margin:0;padding:40px 18px;background:#f5f6f7;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans JP',sans-serif;color:#111;">
<main style="max-width:620px;margin:0 auto;padding:34px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
<p style="margin:0 0 12px;color:#6b7280;font-size:13px;font-weight:800;letter-spacing:.08em;">SPACE GLEAM Blog</p>
<h1 style="margin:0 0 18px;font-size:28px;line-height:1.35;">配信停止しました</h1>
<p style="margin:0;color:#333;line-height:1.8;">${escapeHtml(email)} へのブログ更新メール配信を停止しました。</p>
<a href="https://spacegleam.co.jp/blog/" style="display:inline-block;margin-top:28px;color:#111;font-weight:800;">ブログへ戻る</a>
</main></body></html>`);
};

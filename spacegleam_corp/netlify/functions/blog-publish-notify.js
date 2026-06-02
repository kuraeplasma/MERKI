'use strict';

const RESEND_API_URL = 'https://api.resend.com/broadcasts';
const FROM_EMAIL = process.env.MAIL_FROM || 'SPACE GLEAM <noreply@send.spacegleam.co.jp>';
const BLOG_SEGMENT_ID = process.env.RESEND_BLOG_SEGMENT_ID || '';

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function articleEmailHtml(post) {
    const title = escapeHtml(post.title);
    const excerpt = escapeHtml(post.excerpt || 'SPACE GLEAM Blogで新しい記事を公開しました。');
    const category = escapeHtml(post.category || 'Blog');
    const url = escapeHtml(post.url);

    return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Noto Sans JP','Hiragino Sans','Yu Gothic','Meiryo',Arial,sans-serif;color:#111;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:32px 14px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #242424;">
<tr><td style="padding:42px;background:linear-gradient(135deg,#050505,#151515);color:#fff;">
<p style="margin:0 0 18px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#b8bec5;">SPACE GLEAM BLOG / ${category}</p>
<h1 style="margin:0;font-size:30px;line-height:1.45;letter-spacing:0;">${title}</h1>
<p style="margin:20px 0 0;color:#d1d5d9;line-height:1.9;font-size:15px;">${excerpt}</p>
</td></tr>
<tr><td style="padding:34px 42px;">
<p style="margin:0;color:#333941;line-height:1.9;font-size:15px;">新しい記事を公開しました。自社サービス運営、AI開発、事業づくりの実践から得た内容をまとめています。</p>
<a href="${url}" style="display:inline-block;margin-top:28px;padding:14px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:800;">記事を読む →</a>
</td></tr>
<tr><td style="padding:20px 42px;background:#f8f8f8;color:#747b82;font-size:12px;line-height:1.7;">SPACE GLEAM Blog<br>配信停止はこちら: {{{RESEND_UNSUBSCRIBE_URL}}}</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return json(204, {});
    if (event.httpMethod !== 'POST') return json(405, { success: false, message: 'Method Not Allowed' });

    const secret = clean(process.env.BLOG_NOTIFY_SECRET, 240);
    const token = clean((event.headers.authorization || '').replace(/^Bearer\s+/i, ''), 240);
    if (!secret || token !== secret) {
        return json(401, { success: false, message: 'Unauthorized' });
    }

    const apiKey = clean(process.env.RESEND_API_KEY, 240);
    if (!apiKey || !BLOG_SEGMENT_ID) {
        return json(500, { success: false, message: 'RESEND_API_KEY と RESEND_BLOG_SEGMENT_ID を設定してください。' });
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const post = {
            title: clean(body.title, 180),
            excerpt: clean(body.excerpt, 500),
            category: clean(body.category, 80),
            url: clean(body.url, 500)
        };

        if (!post.title || !post.url) {
            return json(400, { success: false, message: 'title と url が必要です。' });
        }

        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                segmentId: BLOG_SEGMENT_ID,
                from: FROM_EMAIL,
                subject: `【SPACE GLEAM Blog】${post.title}`,
                html: articleEmailHtml(post),
                text: `${post.title}\n\n${post.excerpt}\n\n${post.url}`,
                name: `blog-${Date.now()}`,
                send: true
            })
        });

        const result = await response.json().catch(() => null);
        if (!response.ok || result?.error) {
            return json(500, { success: false, message: '配信作成に失敗しました。', detail: result?.error || null });
        }

        return json(200, { success: true, message: 'ブログ更新メールを配信しました。', id: result?.id });
    } catch (error) {
        return json(500, { success: false, message: '配信に失敗しました。' });
    }
};

'use strict';

const ADMIN_USER = process.env.BLOG_ADMIN_USER || 'kurae';
const ADMIN_PASSWORD = process.env.BLOG_ADMIN_PASSWORD || '';

function unauthorized() {
    return {
        statusCode: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="SPACE GLEAM Blog Admin"',
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store'
        },
        body: 'Authentication required'
    };
}

function decodeBasicAuth(header) {
    const match = String(header || '').match(/^Basic\s+(.+)$/i);
    if (!match) return null;

    try {
        const decoded = Buffer.from(match[1], 'base64').toString('utf8');
        const separator = decoded.indexOf(':');
        if (separator < 0) return null;
        return {
            user: decoded.slice(0, separator),
            password: decoded.slice(separator + 1)
        };
    } catch (_) {
        return null;
    }
}

function timingSafeEqualString(left, right) {
    const leftBuffer = Buffer.from(String(left || ''), 'utf8');
    const rightBuffer = Buffer.from(String(right || ''), 'utf8');
    if (leftBuffer.length !== rightBuffer.length) return false;
    return require('crypto').timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(event) {
    if (!ADMIN_PASSWORD) return false;
    const credentials = decodeBasicAuth(event.headers.authorization);
    if (!credentials) return false;
    return timingSafeEqualString(credentials.user, ADMIN_USER)
        && timingSafeEqualString(credentials.password, ADMIN_PASSWORD);
}

function page() {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex,nofollow">
    <title>Blog Admin | SPACE GLEAM</title>
    <link rel="icon" href="https://spacegleam.co.jp/favicon.png">
    <link rel="stylesheet" href="https://spacegleam.co.jp/style.css?v=blog-editor-20260602-admin">
</head>
<body class="blog-page-body">
    <header class="header">
        <div class="container header-inner">
                <a href="https://spacegleam.co.jp/" class="brand" aria-label="SPACE GLEAM ホーム">
                <span class="brand-name">SPACE GLEAM</span>
            </a>
            <nav class="nav" aria-label="ブログ管理">
                <a href="https://spacegleam.co.jp/blog/">Blog</a>
                <a href="https://spacegleam.co.jp/">Home</a>
            </nav>
            <div class="header-ctas">
                <a href="https://spacegleam.co.jp/#contact" class="header-cta">無料相談する<span class="arrow">→</span></a>
            </div>
        </div>
    </header>

    <main class="blog-main">
        <div class="container">
            <section class="blog-admin-guide">
                <p class="blog-eyebrow">Blog Admin</p>
                <h1>使い方</h1>
                <ol>
                    <li>記事を書いて、下書き保存します。</li>
                    <li>公開する時は「公開準備をまとめてコピー」を押します。</li>
                    <li>コピーした内容をCodexに貼って「この記事を本番公開して」と依頼します。</li>
                    <li>公開後に「公開通知メールを配信する」で購読者へ通知します。</li>
                </ol>
            </section>

            <section class="blog-editor-layout">
                <form class="blog-editor-form" data-blog-editor>
                    <div class="blog-editor-drafts">
                        <label>下書き<select data-draft-list><option value="">新規作成</option></select></label>
                        <div class="blog-editor-draft-actions">
                            <button type="button" data-save-draft>下書き保存</button>
                            <button type="button" data-delete-draft>削除</button>
                        </div>
                    </div>
                    <label>状態
                        <select name="status">
                            <option value="draft">下書き</option>
                            <option value="scheduled">予約投稿</option>
                            <option value="published">公開済み</option>
                        </select>
                    </label>
                    <label>タイトル<input name="title" type="text" value="AI時代のMVP開発で最初に決めること" required></label>
                    <label>スラッグ
                        <div class="blog-editor-slug-row">
                            <input name="slug" type="text" value="ai-mvp-first-decisions" required>
                            <button type="button" data-slug-from-title>タイトルから生成</button>
                            <button type="button" data-slug-random>ランダム生成</button>
                        </div>
                    </label>
                    <label>カテゴリ
                        <select name="category">
                            <option>Development</option>
                            <option>AI</option>
                            <option>SaaS</option>
                            <option>Business</option>
                            <option>Product</option>
                        </select>
                    </label>
                    <label>公開日<input name="date" type="date" required></label>
                    <label>予約公開日時<input name="publishAt" type="datetime-local" required></label>
                    <div class="blog-editor-image-field">
                        <span>画像</span>
                        <button class="blog-editor-image-dropzone" type="button" data-image-dropzone>
                            画像をここに貼り付け、またはクリックして選択
                        </button>
                        <input name="imageFile" type="file" accept="image/*" data-image-file hidden>
                        <button class="blog-editor-image-clear" type="button" data-clear-image>画像を削除</button>
                    </div>
                    <div class="blog-editor-image-preview" data-image-preview aria-hidden="true"></div>
                    <label>概要<textarea name="description" rows="3" required>AIを使ってMVP開発を始める前に決めるべき、検証仮説、初期機能、運用設計の考え方を整理します。</textarea></label>
                    <label>本文<textarea name="body" rows="12" required>AIを使うと、MVPの初期実装はかなり速くなります。

ただし、最初に決めるべきことは技術選定ではありません。誰のどんな課題を、どの順番で検証するかです。

## 最初に決めること

最初に決めるべきなのは、成功条件、初期ユーザー、検証する業務フローです。

## 作りすぎない設計

AIで開発速度が上がるほど、作りすぎのリスクも上がります。最初は検証に必要な機能だけに絞ることが重要です。

## 運用まで含めて考える

MVPは公開して終わりではありません。問い合わせ、ログ、改善要望を受け取る仕組みまで設計しておくと、次の改善が速くなります。</textarea></label>
                    <button class="header-cta blog-editor-submit" type="submit">生成する<span class="arrow">→</span></button>
                </form>

                <div class="blog-editor-output">
                    <div class="blog-editor-publish-panel">
                        <h2>公開準備</h2>
                        <p>記事を書き終えたら、このボタンで公開に必要な内容をまとめてコピーします。</p>
                        <button type="button" data-copy-publish-package>公開準備をまとめてコピー</button>
                        <p data-publish-status aria-live="polite"></p>
                    </div>
                    <div class="blog-editor-notify">
                        <label>通知用シークレット<input type="password" data-notify-secret autocomplete="off"></label>
                        <button type="button" data-send-notify>公開通知メールを配信する</button>
                        <p data-notify-status aria-live="polite"></p>
                    </div>
                    <details class="blog-editor-manual-output">
                        <summary>手動出力を開く</summary>
                        <div class="blog-editor-help">
                            <p><strong>posts.js用</strong> ブログ一覧に表示するためのデータです。</p>
                            <p><strong>記事HTML</strong> 記事ページそのものです。スラッグ名のフォルダに保存します。</p>
                            <p><strong>配信用JSON</strong> 公開後にメール通知へ渡すタイトル・URL情報です。</p>
                        </div>
                        <div class="blog-editor-actions">
                            <button type="button" data-copy-post>posts.js用をコピー</button>
                            <button type="button" data-copy-html>記事HTMLをコピー</button>
                            <button type="button" data-copy-notify>配信用JSONをコピー</button>
                        </div>
                        <label>posts.js 追記用<textarea data-post-output rows="12" readonly></textarea></label>
                        <label>記事HTML<textarea data-html-output rows="18" readonly></textarea></label>
                        <label>公開後メール配信用JSON<textarea data-notify-output rows="8" readonly></textarea></label>
                    </details>
                </div>
            </section>
        </div>
    </main>

    <script src="https://spacegleam.co.jp/blog/editor.js?v=20260602-admin"></script>
</body>
</html>`;
}

exports.handler = async (event) => {
    if (!isAuthorized(event)) return unauthorized();

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store'
        },
        body: page()
    };
};

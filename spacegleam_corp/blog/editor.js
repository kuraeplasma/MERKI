(function () {
    const form = document.querySelector('[data-blog-editor]');
    const postOutput = document.querySelector('[data-post-output]');
    const htmlOutput = document.querySelector('[data-html-output]');
    const notifyOutput = document.querySelector('[data-notify-output]');
    const notifyStatus = document.querySelector('[data-notify-status]');
    const publishStatus = document.querySelector('[data-publish-status]');
    const draftList = document.querySelector('[data-draft-list]');
    const draftStatus = document.querySelector('[data-draft-status]');
    const imageFileInput = document.querySelector('[data-image-file]');
    const imageDropzone = document.querySelector('[data-image-dropzone]');
    const imagePreview = document.querySelector('[data-image-preview]');
    const dateInput = form?.elements.date;
    const publishInput = form?.elements.publishAt;
    const draftsKey = 'spacegleam_blog_drafts';
    let uploadedImageData = '';

    const today = new Date();
    const yyyyMmDd = today.toISOString().slice(0, 10);
    const localDateTime = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    if (dateInput) dateInput.value = yyyyMmDd;
    if (publishInput) publishInput.value = localDateTime;

    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));

    const escapeJs = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const titleSlugWords = [
        ['AI', 'ai'],
        ['ＭＶＰ', 'mvp'],
        ['MVP', 'mvp'],
        ['SaaS', 'saas'],
        ['サービス', 'service'],
        ['開発', 'development'],
        ['運営', 'operation'],
        ['事業', 'business'],
        ['プロダクト', 'product'],
        ['自社', 'own'],
        ['生成', 'generative'],
        ['導入', 'implementation'],
        ['改善', 'improvement'],
        ['設計', 'design'],
        ['検証', 'validation'],
        ['未来', 'future'],
        ['最初', 'first'],
        ['決める', 'decisions'],
        ['作る', 'build'],
        ['続ける', 'continue']
    ];

    const slugify = (value) => String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const randomSlug = (prefix = 'post') => {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const id = Math.random().toString(36).slice(2, 8);
        return `${prefix}-${date}-${id}`;
    };

    const slugFromTitle = (title) => {
        const ascii = slugify(title);
        if (ascii) return ascii;

        const words = titleSlugWords
            .filter(([source]) => String(title || '').includes(source))
            .map(([, slug]) => slug);
        const unique = [...new Set(words)];
        if (unique.length) return `${unique.slice(0, 5).join('-')}-${Math.random().toString(36).slice(2, 6)}`;
        return randomSlug('blog');
    };

    const getDrafts = () => JSON.parse(window.localStorage.getItem(draftsKey) || '[]');

    const setDrafts = (drafts) => {
        window.localStorage.setItem(draftsKey, JSON.stringify(drafts));
    };

    const setDraftStatus = (message, state = '') => {
        if (!draftStatus) return;
        draftStatus.textContent = message;
        draftStatus.dataset.state = state;
    };

    const getFormData = () => {
        const data = Object.fromEntries(new FormData(form).entries());
        data.title = String(data.title || '').trim();
        data.slug = slugify(data.slug || data.title);
        data.description = String(data.description || '').trim();
        data.body = String(data.body || '').trim();
        data.imageUrl = uploadedImageData;
        data.status = data.status || 'draft';
        data.publishAt = data.publishAt || localDateTime;
        data.date = data.date || yyyyMmDd;
        return data;
    };

    const renderInlineMarkdown = (value) => escapeHtml(value)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');

    const renderBody = (markdown) => markdown
        .split(/\n{2,}/)
        .map((block) => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('## ')) return `<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`;
            if (trimmed.startsWith('### ')) return `<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`;
            if (/^[-*]\s+/m.test(trimmed)) {
                const items = trimmed
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => /^[-*]\s+/.test(line))
                    .map((line) => `<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</li>`)
                    .join('');
                return `<ul>${items}</ul>`;
            }
            return `<p>${renderInlineMarkdown(trimmed).replace(/\n/g, '<br>')}</p>`;
        })
        .join('\n');

    const refreshDraftList = () => {
        if (!draftList) return;
        const drafts = getDrafts();
        draftList.innerHTML = '<option value="">新規作成</option>';
        drafts
            .slice()
            .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
            .forEach((draft) => {
                const option = document.createElement('option');
                option.value = draft.id;
                option.textContent = `${draft.title || '無題'} / ${draft.status || 'draft'}`;
                draftList.appendChild(option);
            });
    };

    const fillForm = (draft) => {
        if (!draft || !form) return;
        ['status', 'title', 'slug', 'category', 'date', 'publishAt', 'description', 'body'].forEach((key) => {
            if (form.elements[key] && draft[key] !== undefined) form.elements[key].value = draft[key];
        });
        uploadedImageData = draft.uploadedImageData || draft.imageUrl || '';
        updateImagePreview();
        build();
        setDraftStatus(`「${draft.title || '無題'}」を読み込みました。編集できます。`, 'success');
    };

    const updateImagePreview = () => {
        if (!imagePreview) return;
        const url = uploadedImageData;
        imagePreview.style.backgroundImage = url ? `url("${url}")` : '';
        imagePreview.toggleAttribute('aria-hidden', !url);
        if (imageDropzone) {
            imageDropzone.textContent = url ? '画像を変更する' : '画像をここに貼り付け、またはクリックして選択';
        }
    };

    const setImageFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            uploadedImageData = String(reader.result || '');
            updateImagePreview();
            build();
        });
        reader.readAsDataURL(file);
    };

    const build = () => {
        if (!form) return;
        const data = getFormData();
        const publishAt = `${data.publishAt}:00+09:00`;
        const imageMeta = 'https://spacegleam.co.jp/blog-ogp.png';
        const bodyHtml = renderBody(data.body);
        const imageHtml = data.imageUrl
            ? `\n            <figure class="article-cover"><img src="${escapeHtml(data.imageUrl)}" alt=""></figure>`
            : '';
        const articleUrl = `https://spacegleam.co.jp/blog/${data.slug}/`;
        const mailShareUrl = `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(articleUrl)}`;
        const shareHtml = `
            <div class="article-share" aria-label="記事を共有">
                <button type="button" class="article-share-icon is-x" aria-label="Xでシェア" title="Xでシェア" data-share data-share-title="${escapeHtml(data.title)}" data-share-url="${escapeHtml(articleUrl)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"></path></svg>
                </button>
                <a href="${escapeHtml(mailShareUrl)}" class="article-share-icon is-mail" aria-label="メールでシェア" title="メールでシェア">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.4l8 5.15 8-5.15V7H4Zm0 2.78V17h16V9.78l-8 5.15-8-5.15Z"></path></svg>
                </a>
                <button type="button" class="article-share-icon" aria-label="URLをコピー" title="URLをコピー" data-copy-url="${escapeHtml(articleUrl)}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9.5A1.5 1.5 0 0 1 10.5 8h8A1.5 1.5 0 0 1 20 9.5v8A1.5 1.5 0 0 1 18.5 19h-8A1.5 1.5 0 0 1 9 17.5v-8Z"></path><path d="M6 15H5.5A1.5 1.5 0 0 1 4 13.5v-8A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V6"></path></svg>
                </button>
            </div>`;
        const bottomShareHtml = shareHtml.replace('article-share"', 'article-share article-share-bottom"');
        const notifyPayload = {
            title: data.title,
            excerpt: data.description,
            category: data.category,
            url: articleUrl
        };
        const draftNote = data.status === 'draft'
            ? '// 下書きです。公開するまで posts.js に追加しないでください。\n'
            : '';
        const postEntry = `${draftNote}    {\n        slug: '${data.slug}',\n        title: '${escapeJs(data.title)}',\n        date: '${data.date}',\n        publishAt: '${publishAt}',\n        status: '${data.status}',\n        category: '${data.category}',\n        description: '${escapeJs(data.description)}',\n        excerpt: '${escapeJs(data.description)}',\n        url: '${articleUrl}'${data.imageUrl ? `,\n        thumbnail: '${escapeJs(data.imageUrl)}'` : ''}\n    },`;

        const articleHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="/tracking.js"></script>
    <title>${escapeHtml(data.title)} | SPACE GLEAM</title>
    <meta name="description" content="${escapeHtml(data.description)}">
    <link rel="canonical" href="https://spacegleam.co.jp/blog/${data.slug}/">
    <link rel="icon" href="../../favicon.png">
    <link rel="stylesheet" href="../../style.css?v=blog-20260602">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(data.title)}">
    <meta property="og:description" content="${escapeHtml(data.description)}">
    <meta property="og:url" content="https://spacegleam.co.jp/blog/${data.slug}/">
    <meta property="og:site_name" content="SPACE GLEAM">
    <meta property="og:image" content="${escapeHtml(imageMeta)}">
    <meta property="og:image:secure_url" content="${escapeHtml(imageMeta)}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1536">
    <meta property="og:image:height" content="1024">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${escapeHtml(imageMeta)}">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"${data.title.replace(/"/g, '\\"')}","description":"${data.description.replace(/"/g, '\\"')}","datePublished":"${data.date}","dateModified":"${data.date}","author":{"@type":"Organization","name":"SPACE GLEAM"},"publisher":{"@type":"Organization","name":"SPACE GLEAM","logo":{"@type":"ImageObject","url":"https://spacegleam.co.jp/favicon.png"}},"mainEntityOfPage":"https://spacegleam.co.jp/blog/${data.slug}/","image":"${imageMeta}","articleSection":"${data.category}"}</script>
</head>
<body class="blog-page-body" data-article-slug="${data.slug}">
    <main class="blog-main"><div class="container">
        <article>
            <header class="article-header">
                <div class="article-meta"><time datetime="${data.date}">${data.date}</time><span class="article-category">${data.category}</span></div>
                <h1>${escapeHtml(data.title)}</h1>
                <p class="article-lead">${escapeHtml(data.description)}</p>
            </header>${imageHtml}
${shareHtml}
            <div class="article-content">
${bodyHtml}
            </div>
${bottomShareHtml}
        </article>
        <div class="article-cta"><div><strong>AIシステム開発のご相談はこちら</strong><p>AI MVP、SaaS、業務システムの初期設計からご相談いただけます。</p></div><a href="../../index.html#contact">問い合わせる</a></div>
        <section class="related-section"><h2>関連記事</h2><div class="related-grid" data-related-posts></div></section>
    </div></main>
    <script src="../../script.js"></script><script src="../posts.js"></script><script src="../blog.js?v=20260602-subscribe-fix"></script>
</body>
</html>`;

        postOutput.value = postEntry;
        htmlOutput.value = articleHtml;
        notifyOutput.value = JSON.stringify(notifyPayload, null, 2);
    };

    const createPublishPackage = () => {
        const data = getFormData();
        return `この記事を本番公開してください。

公開状態: ${data.status}
記事URL: https://spacegleam.co.jp/blog/${data.slug}/
記事HTMLの保存先: spacegleam_corp/blog/${data.slug}/index.html
posts.jsへの追加先: spacegleam_corp/blog/posts.js

予約投稿の場合は publishAt の時刻まで一覧に表示されないようにしてください。
公開後、必要なら以下の配信用JSONで購読者へ通知してください。

--- posts.js 追記用 ---
${postOutput.value}

--- 記事HTML ---
${htmlOutput.value}

--- 配信用JSON ---
${notifyOutput.value}
`;
    };

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        build();
    });

    form?.addEventListener('input', () => {
        updateImagePreview();
        build();
    });

    imageFileInput?.addEventListener('change', () => {
        const file = imageFileInput.files?.[0];
        if (!file) {
            uploadedImageData = '';
            updateImagePreview();
            build();
            return;
        }

        setImageFile(file);
    });

    imageDropzone?.addEventListener('click', () => {
        imageFileInput?.click();
    });

    imageDropzone?.addEventListener('dragover', (event) => {
        event.preventDefault();
        imageDropzone.classList.add('is-dragging');
    });

    imageDropzone?.addEventListener('dragleave', () => {
        imageDropzone.classList.remove('is-dragging');
    });

    imageDropzone?.addEventListener('drop', (event) => {
        event.preventDefault();
        imageDropzone.classList.remove('is-dragging');
        setImageFile(event.dataTransfer?.files?.[0]);
    });

    window.addEventListener('paste', (event) => {
        const file = Array.from(event.clipboardData?.items || [])
            .find((item) => item.type.startsWith('image/'))
            ?.getAsFile();
        if (!file) return;
        setImageFile(file);
    });

    document.querySelector('[data-clear-image]')?.addEventListener('click', () => {
        uploadedImageData = '';
        if (imageFileInput) imageFileInput.value = '';
        updateImagePreview();
        build();
    });

    draftList?.addEventListener('change', () => {
        const draft = getDrafts().find((item) => item.id === draftList.value);
        if (draft) fillForm(draft);
    });

    document.querySelector('[data-save-draft]')?.addEventListener('click', () => {
        const data = getFormData();
        const id = draftList?.value || data.slug || String(Date.now());
        const drafts = getDrafts().filter((item) => item.id !== id);
        drafts.push({ ...data, id, uploadedImageData, updatedAt: new Date().toISOString() });
        setDrafts(drafts);
        refreshDraftList();
        if (draftList) draftList.value = id;
        setDraftStatus(`下書きを保存しました。この端末のブラウザに保存されています。`, 'success');
    });

    document.querySelector('[data-delete-draft]')?.addEventListener('click', () => {
        if (!draftList?.value) return;
        setDrafts(getDrafts().filter((item) => item.id !== draftList.value));
        draftList.value = '';
        refreshDraftList();
        setDraftStatus('下書きを削除しました。', 'success');
    });

    document.querySelector('[data-copy-post]')?.addEventListener('click', () => navigator.clipboard?.writeText(postOutput.value));
    document.querySelector('[data-copy-html]')?.addEventListener('click', () => navigator.clipboard?.writeText(htmlOutput.value));
    document.querySelector('[data-copy-notify]')?.addEventListener('click', () => navigator.clipboard?.writeText(notifyOutput.value));
    document.querySelector('[data-copy-publish-package]')?.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(createPublishPackage());
            publishStatus.textContent = '公開準備をコピーしました。Codexに貼って公開依頼してください。';
            publishStatus.dataset.state = 'success';
        } catch (_) {
            publishStatus.textContent = 'コピーできませんでした。手動出力を開いてコピーしてください。';
            publishStatus.dataset.state = 'error';
        }
    });
    document.querySelector('[data-slug-from-title]')?.addEventListener('click', () => {
        form.elements.slug.value = slugFromTitle(form.elements.title.value);
        build();
    });
    document.querySelector('[data-slug-random]')?.addEventListener('click', () => {
        form.elements.slug.value = randomSlug('blog');
        build();
    });
    document.querySelector('[data-send-notify]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        let payload;
        try {
            payload = JSON.parse(notifyOutput.value || '{}');
        } catch (_) {
            notifyStatus.textContent = '配信用JSONを生成してください。';
            notifyStatus.dataset.state = 'error';
            return;
        }

        button.disabled = true;
        notifyStatus.textContent = '配信しています。';
        notifyStatus.dataset.state = 'pending';

        try {
            const response = await fetch('/.netlify/functions/blog-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.success === false) {
                throw new Error(result.message || '配信に失敗しました。');
            }
            notifyStatus.textContent = result.message || 'ブログ更新メールを配信しました。';
            notifyStatus.dataset.state = 'success';
        } catch (error) {
            notifyStatus.textContent = error.message || '配信に失敗しました。';
            notifyStatus.dataset.state = 'error';
        } finally {
            button.disabled = false;
        }
    });

    refreshDraftList();
    updateImagePreview();
    build();
}());

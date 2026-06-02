(function () {
    const form = document.querySelector('[data-blog-editor]');
    const postOutput = document.querySelector('[data-post-output]');
    const htmlOutput = document.querySelector('[data-html-output]');
    const notifyOutput = document.querySelector('[data-notify-output]');
    const notifySecretInput = document.querySelector('[data-notify-secret]');
    const notifyStatus = document.querySelector('[data-notify-status]');
    const draftList = document.querySelector('[data-draft-list]');
    const imageFileInput = document.querySelector('[data-image-file]');
    const imagePreview = document.querySelector('[data-image-preview]');
    const dateInput = form?.elements.date;
    const publishInput = form?.elements.publishAt;
    const notifySecretKey = 'spacegleam_blog_notify_secret';
    const draftsKey = 'spacegleam_blog_drafts';
    let uploadedImageData = '';

    const today = new Date();
    const yyyyMmDd = today.toISOString().slice(0, 10);
    const localDateTime = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    if (dateInput) dateInput.value = yyyyMmDd;
    if (publishInput) publishInput.value = localDateTime;
    if (notifySecretInput) notifySecretInput.value = window.localStorage.getItem(notifySecretKey) || '';

    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));

    const escapeJs = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const slugify = (value) => String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const getDrafts = () => JSON.parse(window.localStorage.getItem(draftsKey) || '[]');

    const setDrafts = (drafts) => {
        window.localStorage.setItem(draftsKey, JSON.stringify(drafts));
    };

    const getFormData = () => {
        const data = Object.fromEntries(new FormData(form).entries());
        data.title = String(data.title || '').trim();
        data.slug = slugify(data.slug || data.title);
        data.description = String(data.description || '').trim();
        data.body = String(data.body || '').trim();
        data.imageUrl = String(data.imageUrl || '').trim() || uploadedImageData;
        data.status = data.status || 'draft';
        data.publishAt = data.publishAt || localDateTime;
        data.date = data.date || yyyyMmDd;
        return data;
    };

    const renderBody = (markdown) => markdown
        .split(/\n{2,}/)
        .map((block) => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('## ')) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
            if (trimmed.startsWith('### ')) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
            return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`;
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
        ['status', 'title', 'slug', 'category', 'date', 'publishAt', 'imageUrl', 'description', 'body'].forEach((key) => {
            if (form.elements[key] && draft[key] !== undefined) form.elements[key].value = draft[key];
        });
        uploadedImageData = draft.uploadedImageData || '';
        updateImagePreview();
        build();
    };

    const updateImagePreview = () => {
        if (!imagePreview) return;
        const url = String(form?.elements.imageUrl?.value || '').trim() || uploadedImageData;
        imagePreview.style.backgroundImage = url ? `url("${url}")` : '';
        imagePreview.toggleAttribute('aria-hidden', !url);
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
        const notifyPayload = {
            title: data.title,
            excerpt: data.description,
            category: data.category,
            url: `https://spacegleam.co.jp/blog/${data.slug}/`
        };
        const draftNote = data.status === 'draft'
            ? '// 下書きです。公開するまで posts.js に追加しないでください。\n'
            : '';
        const postEntry = `${draftNote}    {\n        slug: '${data.slug}',\n        title: '${escapeJs(data.title)}',\n        date: '${data.date}',\n        publishAt: '${publishAt}',\n        status: '${data.status}',\n        category: '${data.category}',\n        description: '${escapeJs(data.description)}',\n        excerpt: '${escapeJs(data.description)}',\n        url: 'https://spacegleam.co.jp/blog/${data.slug}/'${data.imageUrl ? `,\n        thumbnail: '${escapeJs(data.imageUrl)}'` : ''}\n    },`;

        const articleHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            <div class="article-content">
${bodyHtml}
            </div>
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

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            uploadedImageData = String(reader.result || '');
            updateImagePreview();
            build();
        });
        reader.readAsDataURL(file);
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
    });

    document.querySelector('[data-delete-draft]')?.addEventListener('click', () => {
        if (!draftList?.value) return;
        setDrafts(getDrafts().filter((item) => item.id !== draftList.value));
        draftList.value = '';
        refreshDraftList();
    });

    document.querySelector('[data-copy-post]')?.addEventListener('click', () => navigator.clipboard?.writeText(postOutput.value));
    document.querySelector('[data-copy-html]')?.addEventListener('click', () => navigator.clipboard?.writeText(htmlOutput.value));
    document.querySelector('[data-copy-notify]')?.addEventListener('click', () => navigator.clipboard?.writeText(notifyOutput.value));
    document.querySelector('[data-send-notify]')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        const secret = notifySecretInput?.value.trim();
        if (!secret) {
            notifyStatus.textContent = '通知用シークレットを入力してください。';
            notifyStatus.dataset.state = 'error';
            return;
        }

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
            window.localStorage.setItem(notifySecretKey, secret);
            const response = await fetch('https://spacegleam.co.jp/.netlify/functions/blog-publish-notify', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${secret}`,
                    'Content-Type': 'application/json'
                },
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

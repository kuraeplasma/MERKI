(function () {
    const form = document.querySelector('[data-blog-editor]');
    const postOutput = document.querySelector('[data-post-output]');
    const htmlOutput = document.querySelector('[data-html-output]');
    const notifyOutput = document.querySelector('[data-notify-output]');
    const dateInput = form?.elements.date;
    const publishInput = form?.elements.publishAt;

    const today = new Date();
    const yyyyMmDd = today.toISOString().slice(0, 10);
    const localDateTime = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    if (dateInput) dateInput.value = yyyyMmDd;
    if (publishInput) publishInput.value = localDateTime;

    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));

    const slugify = (value) => String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const renderBody = (markdown) => markdown
        .split(/\n{2,}/)
        .map((block) => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('## ')) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
            return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`;
        })
        .join('\n');

    const build = () => {
        if (!form) return;
        const data = Object.fromEntries(new FormData(form).entries());
        const slug = slugify(data.slug || data.title);
        const title = data.title.trim();
        const description = data.description.trim();
        const category = data.category;
        const date = data.date;
        const publishAt = `${data.publishAt}:00+09:00`;
        const excerpt = description;
        const bodyHtml = renderBody(data.body);
        const notifyPayload = {
            title,
            excerpt,
            category,
            url: `https://spacegleam.co.jp/blog/${slug}/`
        };
        const postEntry = `    {\n        slug: '${slug}',\n        title: '${title.replace(/'/g, "\\'")}',\n        date: '${date}',\n        publishAt: '${publishAt}',\n        category: '${category}',\n        description: '${description.replace(/'/g, "\\'")}',\n        excerpt: '${excerpt.replace(/'/g, "\\'")}',\n        url: 'https://spacegleam.co.jp/blog/${slug}/'\n    },`;

        const articleHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} | SPACE GLEAM</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="https://spacegleam.co.jp/blog/${slug}/">
    <link rel="icon" href="../../favicon.png">
    <link rel="stylesheet" href="../../style.css?v=blog-20260602">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="https://spacegleam.co.jp/blog/${slug}/">
    <meta property="og:site_name" content="SPACE GLEAM">
    <meta property="og:image" content="https://spacegleam.co.jp/ogp.png">
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"${title.replace(/"/g, '\\"')}","description":"${description.replace(/"/g, '\\"')}","datePublished":"${date}","dateModified":"${date}","author":{"@type":"Organization","name":"SPACE GLEAM"},"publisher":{"@type":"Organization","name":"SPACE GLEAM","logo":{"@type":"ImageObject","url":"https://spacegleam.co.jp/favicon.png"}},"mainEntityOfPage":"https://spacegleam.co.jp/blog/${slug}/","image":"https://spacegleam.co.jp/ogp.png","articleSection":"${category}"}</script>
</head>
<body class="blog-page-body" data-article-slug="${slug}">
    <main class="blog-main"><div class="container">
        <article>
            <header class="article-header">
                <div class="article-meta"><time datetime="${date}">${date}</time><span class="article-category">${category}</span></div>
                <h1>${escapeHtml(title)}</h1>
                <p class="article-lead">${escapeHtml(description)}</p>
            </header>
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

    document.querySelector('[data-copy-post]')?.addEventListener('click', () => navigator.clipboard?.writeText(postOutput.value));
    document.querySelector('[data-copy-html]')?.addEventListener('click', () => navigator.clipboard?.writeText(htmlOutput.value));
    document.querySelector('[data-copy-notify]')?.addEventListener('click', () => navigator.clipboard?.writeText(notifyOutput.value));
    build();
}());

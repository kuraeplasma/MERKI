(function () {
    const allPosts = window.SPACEGLEAM_BLOG_POSTS || [];
    const now = Date.now();
    const posts = allPosts.filter((post) => !post.publishAt || new Date(post.publishAt).getTime() <= now);
    const listRoot = document.querySelector('[data-blog-list]');
    const featuredRoot = document.querySelector('[data-featured-list]');
    const popularRoot = document.querySelector('[data-popular-list]');
    const searchInput = document.querySelector('[data-blog-search]');
    const countRoot = document.querySelector('[data-blog-count]');
    const categoryButtons = document.querySelectorAll('[data-category-filter]');
    const paginationRoot = document.querySelector('[data-blog-pagination]');
    const relatedRoot = document.querySelector('[data-related-posts]');
    const shareButtons = document.querySelectorAll('[data-share]');
    const copyButtons = document.querySelectorAll('[data-copy-url]');
    const mailForms = document.querySelectorAll('.blog-mail-cta form');
    const heroVideo = document.querySelector('.blog-hero-video');
    const articleSlug = document.body.dataset.articleSlug;
    const perPage = 3;
    let currentPage = 1;
    let query = '';
    let activeCategory = 'All';

    const formatDate = (value) => {
        const date = new Date(`${value}T00:00:00+09:00`);
        return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));

    const postHref = (post) => `${escapeHtml(post.slug)}/`;

    const compactDate = (value) => formatDate(value).replace(/年|月/g, '.').replace('日', '');

    const createFeaturedCard = (post, index) => `
        <article class="blog-featured-card ${index === 0 ? 'is-primary' : ''}">
            <a href="${postHref(post)}" aria-label="${escapeHtml(post.title)}を読む">
                <div class="blog-card-art" aria-hidden="true"></div>
                <div class="blog-featured-body">
                    <div class="blog-card-meta">
                        <time datetime="${escapeHtml(post.date)}">${compactDate(post.date)}</time>
                        <span>${escapeHtml(post.category)}</span>
                    </div>
                    <h2>${escapeHtml(post.title)}</h2>
                    <p>${escapeHtml(post.excerpt)}</p>
                    <strong>Read More <span aria-hidden="true">→</span></strong>
                </div>
            </a>
        </article>
    `;

    const createLatestRow = (post) => `
        <article class="blog-latest-row">
            <a href="${postHref(post)}" aria-label="${escapeHtml(post.title)}を読む">
                <div class="blog-latest-thumb" aria-hidden="true"></div>
                <time datetime="${escapeHtml(post.date)}">${compactDate(post.date)}</time>
                <span>${escapeHtml(post.category)}</span>
                <h2>${escapeHtml(post.title)}</h2>
                <em aria-hidden="true">→</em>
            </a>
        </article>
    `;

    const createPopularRow = (post, index) => `
        <a class="blog-popular-row" href="${postHref(post)}">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <div>
                <strong>${escapeHtml(post.title)}</strong>
                <small>${compactDate(post.date)} / ${escapeHtml(post.category)}</small>
            </div>
        </a>
    `;

    const createCard = (post) => `
        <article class="blog-card">
            <div class="blog-card-meta">
                <time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
                <span>${escapeHtml(post.category)}</span>
            </div>
            <h2><a href="${postHref(post)}">${escapeHtml(post.title)}</a></h2>
            <p>${escapeHtml(post.excerpt)}</p>
        </article>
    `;

    const renderList = () => {
        if (!listRoot && !featuredRoot && !popularRoot) return;
        const filtered = posts.filter((post) => {
            const matchesQuery = post.title.toLowerCase().includes(query.toLowerCase());
            const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
            return matchesQuery && matchesCategory;
        });
        const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
        currentPage = Math.min(currentPage, pageCount);
        const start = (currentPage - 1) * perPage;
        const visible = filtered.slice(start, start + perPage);

        if (featuredRoot) {
            featuredRoot.innerHTML = filtered.length
                ? filtered.slice(0, 3).map(createFeaturedCard).join('')
                : '<p class="blog-empty">該当する記事はありません。</p>';
        }

        if (listRoot) {
            const renderer = listRoot.classList.contains('blog-latest-list') ? createLatestRow : createCard;
            listRoot.innerHTML = visible.length
                ? visible.map(renderer).join('')
                : '<p class="blog-empty">該当する記事はありません。</p>';
        }

        if (countRoot) {
            countRoot.textContent = `${filtered.length} article${filtered.length === 1 ? '' : 's'}`;
        }

        if (popularRoot) {
            const popularPosts = posts
                .slice()
                .sort((a, b) => {
                    const aTime = new Date(a.publishAt || `${a.date}T00:00:00+09:00`).getTime();
                    const bTime = new Date(b.publishAt || `${b.date}T00:00:00+09:00`).getTime();
                    return bTime - aTime;
                })
                .slice(0, 5);
            popularRoot.innerHTML = popularPosts.map(createPopularRow).join('');
        }

        if (!paginationRoot) return;
        paginationRoot.innerHTML = '';
        if (pageCount <= 1) return;

        for (let index = 1; index <= pageCount; index += 1) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = String(index);
            button.className = index === currentPage ? 'is-active' : '';
            button.setAttribute('aria-label', `${index}ページ目を表示`);
            button.addEventListener('click', () => {
                currentPage = index;
                renderList();
                (listRoot || featuredRoot).scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            paginationRoot.appendChild(button);
        }
    };

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            query = event.target.value.trim();
            currentPage = 1;
            renderList();
        });
    }

    categoryButtons.forEach((button) => {
        button.addEventListener('click', () => {
            activeCategory = button.dataset.categoryFilter || 'All';
            categoryButtons.forEach((item) => item.classList.toggle('is-active', item === button));
            currentPage = 1;
            renderList();
        });
    });

    const renderRelated = () => {
        if (!relatedRoot || !articleSlug) return;
        const current = posts.find((post) => post.slug === articleSlug);
        const related = posts
            .filter((post) => post.slug !== articleSlug)
            .sort((a, b) => Number(b.category === current?.category) - Number(a.category === current?.category))
            .slice(0, 3);

        relatedRoot.innerHTML = related.map((post) => `
            <a class="related-card" href="../${escapeHtml(post.slug)}/">
                <span>${escapeHtml(post.category)}</span>
                <strong>${escapeHtml(post.title)}</strong>
                <small>${formatDate(post.date)}</small>
            </a>
        `).join('');
    };

    renderList();
    renderRelated();

    shareButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const title = button.dataset.shareTitle || document.title;
            const url = button.dataset.shareUrl || window.location.href;
            const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
            window.open(shareUrl, '_blank', 'noopener,noreferrer,width=720,height=520');
        });
    });

    copyButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            const url = button.dataset.copyUrl || window.location.href;
            const label = button.getAttribute('aria-label') || button.title || 'URLをコピー';
            try {
                await navigator.clipboard.writeText(url);
                button.classList.add('is-copied');
                button.setAttribute('aria-label', 'コピーしました');
                button.title = 'コピーしました';
                window.setTimeout(() => {
                    button.classList.remove('is-copied');
                    button.setAttribute('aria-label', label);
                    button.title = label;
                }, 1800);
            } catch (_) {
                window.prompt('URLをコピーしてください', url);
            }
        });
    });

    const setNewsletterStatus = (form, message, state) => {
        const status = form.querySelector('[data-newsletter-status]');
        if (!status) return;
        status.textContent = message;
        status.dataset.state = state || '';
    };

    mailForms.forEach((form) => {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = form.querySelector('button');
            const emailInput = form.querySelector('input[type="email"]');
            const websiteInput = form.querySelector('input[name="website"]');
            const email = emailInput ? emailInput.value.trim() : '';
            if (!button || !emailInput) return;

            if (!emailInput.checkValidity()) {
                emailInput.reportValidity();
                return;
            }

            button.disabled = true;
            button.textContent = '登録中';
            setNewsletterStatus(form, '登録しています。', 'pending');

            try {
                const response = await fetch('/.netlify/functions/blog-subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        website: websiteInput ? websiteInput.value : '',
                        source: 'blog-top'
                    })
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || result.success === false) {
                    throw new Error(result.message || '登録に失敗しました。');
                }
                setNewsletterStatus(form, result.message || '登録しました。', 'success');
                form.reset();
            } catch (error) {
                try {
                    const key = 'spacegleam_blog_subscribers';
                    const saved = JSON.parse(window.localStorage.getItem(key) || '[]');
                    if (!saved.includes(email)) {
                        saved.push(email);
                        window.localStorage.setItem(key, JSON.stringify(saved));
                    }
                    setNewsletterStatus(form, 'ローカルで登録しました。本番では公開後にメール配信へ接続されます。', 'success');
                    form.reset();
                } catch (_) {
                    setNewsletterStatus(form, error.message || '登録に失敗しました。', 'error');
                }
            } finally {
                button.disabled = false;
                button.innerHTML = '登録する<span aria-hidden="true">→</span>';
            }
        });
    });

    if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        heroVideo.pause();
        heroVideo.removeAttribute('autoplay');
    } else if (heroVideo) {
        heroVideo.playbackRate = 0.45;
    }
}());

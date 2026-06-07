'use strict';

// SPACE GLEAM Blog: publish Function
// Receives generated article HTML + posts.js entry from the admin UI, then
// either commits to GitHub immediately or schedules via Netlify Blobs.

const ADMIN_USER = process.env.BLOG_ADMIN_USER || 'kurae';
const ADMIN_PASSWORD = process.env.BLOG_ADMIN_PASSWORD || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'kuraeplasma/SPACEGLEAM';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
// Subpath inside the repo where the site files live. If the repo root IS the
// site root, leave empty. Our local working tree uses "spacegleam_corp/" as a
// subdir, but on the SPACEGLEAM repo it might be the root — configurable.
const REPO_SUBDIR = process.env.GITHUB_SITE_SUBDIR || '';

const GH = 'https://api.github.com';

// Try to load @netlify/blobs at module load time so deploy bundling picks it up.
let netlifyBlobsModule = null;
let netlifyBlobsLoadError = null;
try {
    netlifyBlobsModule = require('@netlify/blobs');
} catch (e) {
    netlifyBlobsLoadError = e;
}

// ---- helpers ---------------------------------------------------------------

function jsonResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Cache-Control': 'no-store'
        },
        body: JSON.stringify(body)
    };
}

function unauthorized() {
    return {
        statusCode: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="SPACE GLEAM Blog Publish"',
            'Content-Type': 'text/plain; charset=utf-8'
        },
        body: 'Authentication required'
    };
}

function decodeBasicAuth(header) {
    const match = String(header || '').match(/^Basic\s+(.+)$/i);
    if (!match) return null;
    try {
        const decoded = Buffer.from(match[1], 'base64').toString('utf8');
        const sep = decoded.indexOf(':');
        if (sep < 0) return null;
        return { user: decoded.slice(0, sep), password: decoded.slice(sep + 1) };
    } catch (_) { return null; }
}

function timingSafeEqualString(left, right) {
    const a = Buffer.from(String(left || ''), 'utf8');
    const b = Buffer.from(String(right || ''), 'utf8');
    if (a.length !== b.length) return false;
    return require('crypto').timingSafeEqual(a, b);
}

function isAuthorized(event) {
    if (!ADMIN_PASSWORD) return false;
    const h = event.headers || {};
    const c = decodeBasicAuth(h.authorization || h.Authorization);
    if (!c) return false;
    return timingSafeEqualString(c.user, ADMIN_USER)
        && timingSafeEqualString(c.password, ADMIN_PASSWORD);
}

// ---- GitHub API ------------------------------------------------------------

async function gh(path, init = {}) {
    const res = await fetch(`${GH}${path}`, {
        ...init,
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'spacegleam-blog-publish',
            ...(init.headers || {})
        }
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        const err = new Error(`GitHub ${res.status}: ${text}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

async function getBranchRef() {
    return gh(`/repos/${GITHUB_REPO}/git/ref/heads/${GITHUB_BRANCH}`);
}

async function getCommit(sha) {
    return gh(`/repos/${GITHUB_REPO}/git/commits/${sha}`);
}

async function getContentBase64(path) {
    try {
        const res = await gh(`/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path)}?ref=${GITHUB_BRANCH}`);
        return Buffer.from(res.content, 'base64').toString('utf8');
    } catch (e) {
        if (e.status === 404) return null;
        throw e;
    }
}

async function createBlob(content, encoding) {
    // encoding: 'utf8' (default, for text) or 'base64' (for binary already-base64)
    const isBase64 = encoding === 'base64';
    const body = isBase64
        ? { content, encoding: 'base64' }
        : { content: Buffer.from(content, 'utf8').toString('base64'), encoding: 'base64' };
    const data = await gh(`/repos/${GITHUB_REPO}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify(body)
    });
    return data.sha;
}

async function createTree(baseTreeSha, items) {
    const data = await gh(`/repos/${GITHUB_REPO}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({ base_tree: baseTreeSha, tree: items })
    });
    return data.sha;
}

async function createCommit(message, treeSha, parentSha) {
    const data = await gh(`/repos/${GITHUB_REPO}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] })
    });
    return data.sha;
}

async function updateBranchRef(commitSha) {
    return gh(`/repos/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commitSha, force: false })
    });
}

// ---- content transformers --------------------------------------------------

// Insert a new entry at the top of the posts array in posts.js.
// Format of the postEntry payload (from the browser) is the indented "{ ... }"
// block without the surrounding array. We splice it after the opening "[".
function insertPostsEntry(existing, postEntry) {
    const text = existing || `window.SPACEGLEAM_BLOG_POSTS = [\n];\n`;
    const m = text.match(/window\.SPACEGLEAM_BLOG_POSTS\s*=\s*\[/);
    if (!m) throw new Error('posts.js: array start not found');
    const insertAt = m.index + m[0].length;
    const cleaned = postEntry.replace(/^\s*\/\/.*\n/, ''); // drop "// 下書きです..." marker if any
    return text.slice(0, insertAt) + '\n' + cleaned + text.slice(insertAt);
}

// Insert a new URL into sitemap.xml just after the home <url> block.
function insertSitemapEntry(existing, articleUrl, dateStr) {
    if (!existing) {
        return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${articleUrl}</loc><lastmod>${dateStr}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>\n`;
    }
    if (existing.includes(`<loc>${articleUrl}</loc>`)) return existing; // idempotent
    const entry = `  <url>\n    <loc>${articleUrl}</loc>\n    <lastmod>${dateStr}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    // Insert before the </urlset> closing tag
    return existing.replace(/<\/urlset>/, entry + '</urlset>');
}

function repoPath(rel) {
    return REPO_SUBDIR ? `${REPO_SUBDIR.replace(/\/$/, '')}/${rel}` : rel;
}

// ---- main publish logic ----------------------------------------------------

async function publishImmediate(payload) {
    if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN env var is not set');
    const { slug, title, articleHtml, postEntry, date, dryRun } = payload;

    // Dry-run: just verify branch access without committing
    if (dryRun) {
        const ref = await getBranchRef();
        return {
            dryRun: true,
            repo: GITHUB_REPO,
            branch: GITHUB_BRANCH,
            currentSha: ref.object.sha,
            subdir: REPO_SUBDIR || '(repo root)',
            note: 'GitHub auth OK. No commit was made.'
        };
    }

    if (!slug || !articleHtml || !postEntry) {
        throw new Error('missing required fields: slug, articleHtml, postEntry');
    }

    // Read current posts.js + sitemap.xml from the repo
    const postsPath = repoPath('blog/posts.js');
    const articlePath = repoPath(`blog/${slug}/index.html`);
    const sitemapPath = repoPath('sitemap.xml');

    const [postsExisting, sitemapExisting] = await Promise.all([
        getContentBase64(postsPath),
        getContentBase64(sitemapPath)
    ]);

    const newPosts = insertPostsEntry(postsExisting, postEntry);
    const articleUrl = `https://spacegleam.co.jp/blog/${slug}/`;
    const dateStr = date || new Date().toISOString().slice(0, 10);
    const newSitemap = insertSitemapEntry(sitemapExisting, articleUrl, dateStr);

    // Single-commit via Git Trees API
    const ref = await getBranchRef();
    const commit = await getCommit(ref.object.sha);
    const baseTreeSha = commit.tree.sha;

    const [htmlBlob, postsBlob, sitemapBlob] = await Promise.all([
        createBlob(articleHtml),
        createBlob(newPosts),
        createBlob(newSitemap)
    ]);

    const treeItems = [
        { path: articlePath, mode: '100644', type: 'blob', sha: htmlBlob },
        { path: postsPath,   mode: '100644', type: 'blob', sha: postsBlob },
        { path: sitemapPath, mode: '100644', type: 'blob', sha: sitemapBlob }
    ];

    // Optional: include extra files (e.g. OGP image) in the same commit.
    // payload.extraFiles = [{ path: 'blog/foo/ogp.png', contentBase64: '...' }]
    if (Array.isArray(payload.extraFiles) && payload.extraFiles.length) {
        for (const ef of payload.extraFiles) {
            if (!ef || !ef.path || !ef.contentBase64) continue;
            const sha = await createBlob(ef.contentBase64, 'base64');
            treeItems.push({ path: repoPath(ef.path), mode: '100644', type: 'blob', sha });
        }
    }

    const newTree = await createTree(baseTreeSha, treeItems);

    const newCommitSha = await createCommit(
        `blog: publish ${slug} — ${title || ''}`.trim(),
        newTree,
        ref.object.sha
    );
    await updateBranchRef(newCommitSha);

    return {
        commitSha: newCommitSha,
        commitUrl: `https://github.com/${GITHUB_REPO}/commit/${newCommitSha}`,
        articleUrl
    };
}

async function publishScheduled(payload) {
    if (!netlifyBlobsModule) {
        const msg = netlifyBlobsLoadError
            ? `@netlify/blobs failed to load: ${netlifyBlobsLoadError.message}`
            : '@netlify/blobs SDK is null';
        throw new Error(msg);
    }
    const { getStore } = netlifyBlobsModule;
    let store;
    const blobsToken = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
    const blobsSiteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
    try {
        if (blobsToken && blobsSiteID) {
            store = getStore({ name: 'blog-pending', siteID: blobsSiteID, token: blobsToken });
        } else {
            store = getStore('blog-pending');
        }
    } catch (e) {
        throw new Error(`getStore("blog-pending") failed: ${e.message}. Hint: set NETLIFY_SITE_ID and NETLIFY_BLOBS_TOKEN env vars (Functions scope).`);
    }
    const key = `${payload.publishAt}-${payload.slug}.json`;
    await store.set(key, JSON.stringify(payload));
    return { scheduled: true, key, publishAt: payload.publishAt };
}

// ---- handler ---------------------------------------------------------------

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
    if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'POST only' });
    if (!isAuthorized(event)) return unauthorized();

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return jsonResponse(400, { error: 'invalid JSON body' });
    }

    const mode = payload.mode || (payload.publishAt && new Date(payload.publishAt) > new Date() ? 'scheduled' : 'immediate');

    try {
        if (mode === 'scheduled') {
            const result = await publishScheduled(payload);
            return jsonResponse(200, { ok: true, mode, ...result });
        }
        const result = await publishImmediate(payload);
        return jsonResponse(200, { ok: true, mode, ...result });
    } catch (e) {
        return jsonResponse(500, { error: e.message || String(e), stack: e.stack });
    }
};

// Expose publishImmediate so the scheduled function can call it without re-importing.
exports.publishImmediate = publishImmediate;

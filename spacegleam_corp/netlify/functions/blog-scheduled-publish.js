'use strict';

// SPACE GLEAM Blog: scheduled publisher
// Runs every 15 minutes via Netlify Scheduled Functions.
// Lists pending posts in Netlify Blobs and publishes those whose publishAt is due.

const { publishImmediate } = require('./blog-publish');

exports.handler = async () => {
    let store;
    try {
        const { getStore } = require('@netlify/blobs');
        const blobsToken = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
        const blobsSiteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
        if (blobsToken && blobsSiteID) {
            store = getStore({ name: 'blog-pending', siteID: blobsSiteID, token: blobsToken });
        } else {
            store = getStore('blog-pending');
        }
    } catch (e) {
        return { statusCode: 500, body: 'Blobs SDK error: ' + e.message };
    }

    const now = new Date();
    const list = await store.list();
    const results = [];

    for (const item of (list.blobs || [])) {
        // Key format: <ISO publishAt>-<slug>.json
        const isoMatch = item.key.match(/^([^-]+(?:-[^-]+){2}T[^-]+)-(.+)\.json$/);
        const isoPart = isoMatch ? isoMatch[1] : null;
        if (!isoPart) {
            results.push({ key: item.key, skipped: 'unparseable key' });
            continue;
        }
        const due = new Date(isoPart);
        if (isNaN(due.getTime())) {
            results.push({ key: item.key, skipped: 'invalid date' });
            continue;
        }
        if (due > now) continue; // not yet

        try {
            const raw = await store.get(item.key);
            if (!raw) {
                results.push({ key: item.key, skipped: 'blob missing' });
                continue;
            }
            const payload = JSON.parse(raw);
            const r = await publishImmediate(payload);
            await store.delete(item.key);
            results.push({ key: item.key, ok: true, commitSha: r.commitSha });
        } catch (e) {
            results.push({ key: item.key, error: e.message });
        }
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ranAt: now.toISOString(), results })
    };
};

// Run every 15 minutes
exports.config = {
    schedule: '*/15 * * * *'
};

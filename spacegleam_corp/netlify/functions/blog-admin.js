'use strict';

const fs = require('fs');
const path = require('path');

const ADMIN_USER = process.env.BLOG_ADMIN_USER || 'kurae';
const ADMIN_PASSWORD = process.env.BLOG_ADMIN_PASSWORD || '';
const { handler: notifyHandler } = require('./blog-publish-notify');

// Load the admin HTML page from a sibling file. This file is included in the
// function bundle via the "included_files" entry in netlify.toml.
let cachedHtml = null;
function page() {
    if (cachedHtml !== null) return cachedHtml;
    const candidates = [
        path.join(__dirname, 'blog-admin.template.html'),
        // Some bundlers move included_files under a different relative path.
        path.join(process.cwd(), 'netlify/functions/blog-admin.template.html'),
    ];
    for (const p of candidates) {
        try {
            cachedHtml = fs.readFileSync(p, 'utf8');
            return cachedHtml;
        } catch (_) { /* try next */ }
    }
    return '<!doctype html><meta charset="utf-8"><title>Blog Admin</title><p>Template file not bundled. Add to netlify.toml [functions] included_files.</p>';
}

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
    const headers = event.headers || {};
    const credentials = decodeBasicAuth(headers.authorization || headers.Authorization);
    if (!credentials) return false;
    return timingSafeEqualString(credentials.user, ADMIN_USER)
        && timingSafeEqualString(credentials.password, ADMIN_PASSWORD);
}

exports.handler = async (event) => {
    if (!isAuthorized(event)) return unauthorized();

    if (event.httpMethod === 'POST') {
        return notifyHandler({
            ...event,
            httpMethod: 'POST',
            headers: {
                ...event.headers,
                authorization: `Bearer ${process.env.BLOG_NOTIFY_SECRET || ''}`
            }
        });
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store'
        },
        body: page()
    };
};

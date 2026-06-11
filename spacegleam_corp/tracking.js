/**
 * SPACE GLEAM 共通計測タグローダー
 *
 * 内部ユーザー（自分・社内確認用アクセス）を localStorage で判定し、
 * 内部ユーザーの場合は計測タグ（GA4等）を一切読み込まない。
 *
 * 運用:
 *   登録: 任意のページに ?internal=true を付けてアクセス
 *   解除: 任意のページに ?internal=false を付けてアクセス
 *
 * 新しい計測タグ（GTM / Clarity / Pixel 等）を追加する場合は、
 * 必ずこのファイルの「計測タグ読み込み」ブロック内に追加すること。
 */
(function () {
    'use strict';

    /* ---- 1. ?internal=true / ?internal=false の処理 ---- */
    try {
        var params = new URLSearchParams(window.location.search);
        var internalParam = params.get('internal');
        if (internalParam === 'true') {
            localStorage.setItem('internal_user', 'true');
        } else if (internalParam === 'false') {
            localStorage.removeItem('internal_user');
        }
    } catch (e) { /* URLSearchParams / localStorage 非対応環境は通常計測 */ }

    /* ---- 2. 共通判定フラグ ---- */
    var stored = null;
    try { stored = localStorage.getItem('internal_user'); } catch (e) {}
    window.INTERNAL_USER = stored === 'true';
    window.IS_INTERNAL_USER = window.INTERNAL_USER;

    /* ---- 3. デバッグログ（開発環境のみ） ---- */
    var isDev =
        location.protocol === 'file:' ||
        /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname) ||
        /^192\.168\./.test(location.hostname);
    if (isDev) {
        console.log('[Internal Tracking Block]', {
            internalUser: window.INTERNAL_USER,
            value: stored
        });
    }

    /* ---- 4. 計測タグ読み込み（内部ユーザーは発火させない） ---- */
    if (!window.INTERNAL_USER) {
        /* Google Analytics 4 (gtag.js) */
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('js', new Date());
        window.gtag('config', 'G-1T9HP3BLMP');

        var ga = document.createElement('script');
        ga.async = true;
        ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-1T9HP3BLMP';
        document.head.appendChild(ga);

        /*
         * 追加タグはここに記述する:
         * - Google Tag Manager
         * - Microsoft Clarity
         * - Meta Pixel / X Pixel / Google Ads
         */
    } else {
        /* 内部ユーザー: 各種計測関数をノーオペ化（エラー防止） */
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {};
        window.fbq = function () {};
        window.twq = function () {};
        window.clarity = function () {};
    }
})();

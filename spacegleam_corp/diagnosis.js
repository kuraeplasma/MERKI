/* SPACE GLEAM — AI開発診断
   Vanilla JS / ローカル動作 / ルールベース推論 */
(function () {
    'use strict';

    const QUESTIONS = [
        {
            id: 'product',
            title: '作りたいものは？',
            options: [
                { v: 'efficiency', label: '業務効率化ツール' },
                { v: 'chatbot',    label: 'AIチャットボット' },
                { v: 'booking',    label: '予約システム' },
                { v: 'matching',   label: 'マッチングサービス' },
                { v: 'ec',         label: 'ECサイト' },
                { v: 'sns',        label: 'SNS運用ツール' },
                { v: 'other',      label: 'その他' },
            ],
        },
        {
            id: 'stage',
            title: '現在の状況は？',
            options: [
                { v: 'idea',         label: 'アイデア段階' },
                { v: 'requirements', label: '要件整理中' },
                { v: 'designed',     label: '設計済み' },
                { v: 'developing',   label: '開発中' },
                { v: 'running',      label: '運用中' },
            ],
        },
        {
            id: 'users',
            title: '想定ユーザー数は？',
            options: [
                { v: 'u100',    label: '100人未満' },
                { v: 'u1k',     label: '100〜1,000人' },
                { v: 'u10k',    label: '1,000〜10,000人' },
                { v: 'u10kup',  label: '10,000人以上' },
            ],
        },
        {
            id: 'features',
            title: '必要機能数は？',
            options: [
                { v: 'f3',   label: '3個以下' },
                { v: 'f5',   label: '5個程度' },
                { v: 'f10',  label: '10個程度' },
                { v: 'fNA',  label: '未定' },
            ],
        },
        {
            id: 'auth',
            title: 'ログイン機能は？',
            options: [
                { v: 'yes', label: '必要' },
                { v: 'no',  label: '不要' },
            ],
        },
        {
            id: 'payment',
            title: '決済機能は？',
            options: [
                { v: 'yes', label: '必要' },
                { v: 'no',  label: '不要' },
            ],
        },
        {
            id: 'schedule',
            title: '開発希望時期は？',
            options: [
                { v: 'asap', label: '最短での開始を希望' },
                { v: 'm1',   label: '1ヶ月以内' },
                { v: 'm3',   label: '3ヶ月以内' },
                { v: 'na',   label: '時期は未定' },
            ],
        },
    ];

    /** ルールベース診断ロジック */
    function diagnose(ans) {
        const profiles = {
            efficiency: { plan: '業務システム開発', desc: '1業務に絞って効果を検証する社内システム', cost: [30, 65], weeks: [3, 5] },
            chatbot: { plan: 'AI MVP開発', desc: '回答精度と利用価値を短期間で検証するAIプロダクト', cost: [25, 55], weeks: [2, 4] },
            booking: { plan: 'SaaS開発（MVP）', desc: '予約・通知・管理業務を小さくつなぐWebサービス', cost: [30, 60], weeks: [3, 5] },
            matching: { plan: 'SaaS開発（MVP）', desc: '登録・検索・マッチングの成立条件を検証するWebサービス', cost: [40, 80], weeks: [4, 6] },
            ec: { plan: 'SaaS開発（MVP）', desc: '商品・注文・決済の購入導線を検証するECサービス', cost: [35, 75], weeks: [3, 6] },
            sns: { plan: 'SaaS開発（MVP）', desc: '投稿・分析・運用フローを検証するWebサービス', cost: [30, 65], weeks: [3, 5] },
            other: { plan: 'MVP開発', desc: 'コア価値を絞って実現性を確認する検証版', cost: [25, 60], weeks: [2, 5] }
        };
        const profile = profiles[ans.product] || profiles.other;
        let { plan, desc } = profile;
        let [costMin, costMax] = profile.cost;
        let [weeksMin, weeksMax] = profile.weeks;
        let priority = '高';

        if (ans.features === 'f5') {
            costMax += 15;
            weeksMax += 1;
        }
        if (ans.features === 'f10') {
            plan = ans.product === 'efficiency' ? '業務システム開発' : 'SaaS開発';
            desc = '複数機能を段階リリースする本格開発';
            costMin += 30;
            costMax += 80;
            weeksMin += 3;
            weeksMax += 6;
        }
        if (ans.features === 'fNA') {
            costMax += 20;
            weeksMax += 2;
        }
        if (ans.auth === 'yes') {
            costMax += 10;
            weeksMax += 1;
        }
        if (ans.payment === 'yes') {
            costMin += 10;
            costMax += 25;
            weeksMin += 1;
            weeksMax += 2;
        }
        if (ans.users === 'u10k') {
            costMax += 20;
            weeksMax += 1;
        }
        if (ans.users === 'u10kup') {
            plan = ans.product === 'efficiency' ? '業務システム開発' : 'SaaS開発';
            desc = '高負荷・権限・運用設計を含む段階的な本格開発';
            costMin += 50;
            costMax += 120;
            weeksMin += 4;
            weeksMax += 8;
            priority = '中';
        }

        // スピード優先で優先度補正
        if (ans.schedule === 'asap') priority = '高';
        if (ans.schedule === 'na' && priority === '高') priority = '中';

        const tech = ['Next.js', 'Supabase'];
        if (ans.payment === 'yes') tech.push('Stripe');
        if (ans.product === 'chatbot') tech.push('Claude API', 'Vector DB');
        tech.push('Vercel');

        const dedup = [...new Set(tech)];
        const comment = buildComment(plan, ans);
        const reason = buildDiagnosisReason(ans);
        const firstScope = recommendedFeatures(ans).slice(0, ans.features === 'f3' ? 3 : 5);

        return {
            plan, desc,
            cost: `${costMin}万円〜${costMax}万円`,
            weeks: `${weeksMin}〜${weeksMax}週間`,
            priority,
            tech: dedup,
            comment,
            reason,
            firstScope,
            estimateNote: '表示金額・期間は、選択内容をもとにした初期検証版の概算です。外部連携、デザイン要件、既存データ移行などにより変動します。',
            costMin, costMax, weeksMin, weeksMax,
        };
    }

    function buildDiagnosisReason(ans) {
        const reasons = [];
        reasons.push(`${answerLabel('product', ans.product)}を、${answerLabel('features', ans.features)}の機能範囲で検討しているため`);
        if (ans.auth === 'yes') reasons.push('ログイン・権限管理が必要なため');
        if (ans.payment === 'yes') reasons.push('決済と決済後の運用設計が必要なため');
        if (ans.users === 'u10k' || ans.users === 'u10kup') reasons.push(`${answerLabel('users', ans.users)}を想定し、負荷と運用を段階的に設計する必要があるため`);
        if (ans.stage === 'idea') reasons.push('アイデア段階では、作り込む前に利用価値を検証する方が安全なため');
        return reasons.slice(0, 3).join('。') + '。';
    }

    function buildComment(plan, ans) {
        if (plan === 'SaaS開発') {
            return 'スケールを見据えた構成が必要です。初期はコア機能から段階的にリリースし、データを取りながら拡張する設計をおすすめします。';
        }
        if (plan === '業務システム開発') {
            return '現場フローの整理が成功の鍵です。最初は1業務に絞って小さく作り、効果を測りながら横展開する構成がおすすめです。';
        }
        if (ans.stage === 'idea') {
            return 'まずは小さく開発し、市場反応を確認しながら改善していく構成がおすすめです。仮説検証を最短で回しましょう。';
        }
        return 'コア機能を絞ったMVPで素早く立ち上げ、ユーザーのフィードバックを元に改善を回していく構成がおすすめです。';
    }

    /* ============================================================
       ローカルのみ: 診断カード と モーダル を DOM に動的挿入
       index.html にはHTMLを持たせず、diagnosis.js がローカルで注入する
       ============================================================ */
    (function injectDiagHTML() {
        // --- 診断カード ---
        const wrapper = document.getElementById('heroInteractiveWrapper');
        if (wrapper && !document.getElementById('diagCard')) {
            wrapper.innerHTML = `
                <div class="diag-card" id="diagCard">
                    <span class="diag-card__eyebrow">AI開発診断</span>
                    <h2 class="diag-card__title">アイデアを、<br>最短距離でカタチに。</h2>
                    <p class="diag-card__sub">アイデアや要件をもとに、最適な開発の進め方や技術選定、優先すべきポイントを診断します。</p>
                    <p class="diag-card__features-label">診断でわかること</p>
                    <div class="diag-card__features">
                        <div class="diag-card__feature">
                            <span class="diag-card__feature-ico" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>
                            </span>
                            <span class="diag-card__feature-copy">
                                <span class="diag-card__feature-title">最適な開発の進め方</span>
                                <span class="diag-card__feature-sub">目的に合わせた開発ステップと進め方の提案</span>
                            </span>
                        </div>
                        <div class="diag-card__feature">
                            <span class="diag-card__feature-ico" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z"/><path d="M3 12l9 4.5L21 12"/><path d="M3 16.5L12 21l9-4.5"/></svg>
                            </span>
                            <span class="diag-card__feature-copy">
                                <span class="diag-card__feature-title">必要な機能と優先順位</span>
                                <span class="diag-card__feature-sub">実現すべき機能と、優先して取り組むべき項目</span>
                            </span>
                        </div>
                        <div class="diag-card__feature">
                            <span class="diag-card__feature-ico" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h13M4 12h13M4 18h9"/><circle cx="20" cy="6" r="1.2"/><circle cx="20" cy="12" r="1.2"/><circle cx="17" cy="18" r="1.2"/></svg>
                            </span>
                            <span class="diag-card__feature-copy">
                                <span class="diag-card__feature-title">技術の選択肢と構成案</span>
                                <span class="diag-card__feature-sub">最適な技術スタックやシステム構成の方向性</span>
                            </span>
                        </div>
                        <div class="diag-card__feature">
                            <span class="diag-card__feature-ico" aria-hidden="true">
                                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                            </span>
                            <span class="diag-card__feature-copy">
                                <span class="diag-card__feature-title">費用感と開発期間の目安</span>
                                <span class="diag-card__feature-sub">概算の費用感と、リリースまでの期間イメージ</span>
                            </span>
                        </div>
                    </div>
                    <button type="button" class="diag-card__btn" data-diag-open>
                        <span class="diag-card__btn-sparkle" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zm6 10l.9 2.4L21 15l-2.1.6L18 18l-.9-2.4L15 15l2.1-.6L18 12zM5 14l.7 1.8L7.5 16.5l-1.8.7L5 19l-.7-1.8L2.5 16.5l1.8-.7L5 14z"/></svg>
                        </span>
                        無料で診断をはじめる<span class="arrow">→</span>
                    </button>
                    <p class="diag-card__note">
                        <svg class="diag-card__note-ico" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>
                        ご相談・診断はすべて無料です
                    </p>
                </div>
            `;
        }

        // --- モーダル ---
        if (!document.getElementById('diagModal')) {
            const modalEl = document.createElement('div');
            modalEl.className = 'diag-modal';
            modalEl.id = 'diagModal';
            modalEl.setAttribute('role', 'dialog');
            modalEl.setAttribute('aria-modal', 'true');
            modalEl.setAttribute('aria-labelledby', 'diagModalTitle');
            modalEl.setAttribute('aria-hidden', 'true');
            modalEl.innerHTML = `
                <div class="diag-modal__sheet">
                    <button type="button" class="diag-modal__close" data-diag-close aria-label="閉じる">×</button>
                    <div id="diagModalBody"></div>
                </div>
            `;
            document.querySelector('main')?.appendChild(modalEl);
        }
    })();

    /* ====== UI / State ====== */
    const state = {
        step: 0,
        answers: {},
        result: null,
    };

    const modal = document.getElementById('diagModal');
    const body  = document.getElementById('diagModalBody');
    if (!modal || !body) return;
    let modalOpener = null;


    function openModal() {
        modalOpener = document.activeElement;
        state.step = 0;
        state.answers = {};
        state.result = null;
        renderStep();
        document.body.classList.add('diag-is-open');
        document.dispatchEvent(new CustomEvent('diagnosis:toggle'));
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => body.querySelector('.diag-option, button, input')?.focus());
    }
    function closeModal() {
        modal.classList.remove('is-open');
        modal.classList.remove('diag-modal--generating');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        document.body.classList.remove('diag-is-open');
        document.dispatchEvent(new CustomEvent('diagnosis:toggle'));
        modalOpener?.focus();
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function renderStep() {
        modal.classList.remove('diag-modal--generating');
        body.dataset.screen = 'question';
        const total = QUESTIONS.length;
        const idx = state.step;
        const q = QUESTIONS[idx];
        const pct = Math.round(((idx) / total) * 100);

        body.innerHTML = `
            <div class="diag-progress">
                <span class="diag-progress__label">質問 ${idx + 1} / ${total}</span>
                <div class="diag-progress__bar"><div class="diag-progress__fill" style="width:${pct}%"></div></div>
                <span class="diag-progress__pct">${pct}%</span>
            </div>
            <div class="diag-step">
                <h3 id="diagModalTitle">${escapeHtml(q.title)}</h3>
                <div class="diag-options">
                    ${q.options.map(o =>
                        `<button type="button" class="diag-option" data-val="${escapeHtml(o.v)}">
                            <span>${escapeHtml(o.label)}</span>
                        </button>`
                    ).join('')}
                </div>
                ${idx > 0 ? '<button type="button" class="diag-back" data-back>← 前の質問</button>' : ''}
            </div>
        `;

        body.querySelectorAll('.diag-option').forEach(btn => {
            btn.addEventListener('click', () => {
                state.answers[q.id] = btn.dataset.val;
                if (state.step < QUESTIONS.length - 1) {
                    state.step++;
                    renderStep();
                } else {
                    state.result = diagnose(state.answers);
                    renderGenerating(renderResult);
                }
            });
        });
        const back = body.querySelector('[data-back]');
        if (back) back.addEventListener('click', () => {
            state.step = Math.max(0, state.step - 1);
            renderStep();
        });
    }

    function renderResult() {
        modal.classList.remove('diag-modal--generating');
        body.dataset.screen = 'result';
        const r = state.result;
        body.innerHTML = `
            <div class="diag-progress">
                <span class="diag-progress__label">完了</span>
                <div class="diag-progress__bar"><div class="diag-progress__fill" style="width:100%"></div></div>
                <span class="diag-progress__pct">100%</span>
            </div>
            <p class="diag-result__eyebrow">Result</p>
            <h3 class="diag-result__title" id="diagModalTitle">おすすめの開発方針</h3>

            <div class="diag-result__plan">
                <div class="diag-result__plan-kicker">あなたの回答から導いた推奨プラン</div>
                <div class="diag-result__plan-name">${escapeHtml(r.plan)}</div>
                <div class="diag-result__plan-desc">${escapeHtml(r.desc)}</div>
            </div>

            <div class="diag-result__metrics">
                <div class="diag-metric">
                    <div class="diag-metric__label">想定費用</div>
                    <div class="diag-metric__value">${escapeHtml(r.cost)}</div>
                </div>
                <div class="diag-metric">
                    <div class="diag-metric__label">想定期間</div>
                    <div class="diag-metric__value">${escapeHtml(r.weeks)}</div>
                </div>
            </div>

            <div class="diag-result__insight">
                <div>
                    <span>この方針をおすすめする理由</span>
                    <p>${escapeHtml(r.reason)}</p>
                </div>
                <div>
                    <span>最初に作る範囲の目安</span>
                    <p>${r.firstScope.map((item) => escapeHtml(item)).join(' / ')}</p>
                </div>
            </div>

            <p class="diag-estimate-note">${escapeHtml(r.estimateNote)}</p>

            <div class="diag-download-benefits">
                <div class="diag-download-benefits__head">
                    <div>
                        <span class="diag-download-benefits__badge">無料・全4ページ</span>
                        <p class="diag-download-benefits__title">次の打ち合わせにそのまま使える詳細レポート</p>
                    </div>
                    <strong>入力 約1分</strong>
                </div>
                <ul>
                    <li><strong>推奨技術構成</strong>と、それぞれを選ぶ理由</li>
                    <li><strong>30日ロードマップ</strong>と最初に作る機能一覧</li>
                    <li><strong>概算費用の前提</strong>と相談時に決めるべき項目</li>
                </ul>
            </div>

            <div class="diag-actions">
                <button type="button" class="diag-btn-primary" data-pdf>無料で詳細レポートを受け取る</button>
                <p class="diag-download-note">PDFをメールに添付してお送りします</p>
                <button type="button" class="diag-btn-ghost" data-restart>もう一度診断する</button>
            </div>
        `;

        body.querySelector('[data-pdf]').addEventListener('click', renderLeadForm);
        body.querySelector('[data-restart]').addEventListener('click', () => {
            state.step = 0;
            state.answers = {};
            state.result = null;
            renderStep();
        });
    }

    function renderLeadForm() {
        modal.classList.remove('diag-modal--generating');
        body.dataset.screen = 'form';
        body.innerHTML = `
            <p class="diag-result__eyebrow">AI Development Report</p>
            <h3 class="diag-result__title" id="diagModalTitle">AI開発診断レポートを受け取る</h3>
            <p class="diag-form__intro">診断結果をもとに作成した、推奨技術構成・概算費用・開発ロードマップをまとめたPDFレポートをメールでお送りします。</p>
            <form class="diag-form" id="diagLeadForm" novalidate>
                <div class="diag-form__row">
                    <div class="diag-field">
                        <label for="dlf-company">会社名 <span class="diag-required">必須</span></label>
                        <input id="dlf-company" name="company" type="text" autocomplete="organization" placeholder="例）株式会社SPACE GLEAM" required>
                    </div>
                    <div class="diag-field">
                        <label for="dlf-name">お名前 <span class="diag-required">必須</span></label>
                        <input id="dlf-name" name="name" type="text" autocomplete="name" placeholder="例）山田 太郎" required>
                    </div>
                </div>
                <div class="diag-form__row">
                    <div class="diag-field">
                        <label for="dlf-email">メールアドレス <span class="diag-required">必須</span></label>
                        <input id="dlf-email" name="email" type="email" autocomplete="email" placeholder="例）your@email.com" required>
                    </div>
                    <div class="diag-field">
                        <label for="dlf-referrer">どのようにSPACE GLEAMを知りましたか？ <span>任意</span></label>
                        <select id="dlf-referrer" name="referrer">
                            <option value="">選択してください</option>
                            <option>Google検索</option>
                            <option>SNS</option>
                            <option>紹介</option>
                            <option>自社プロダクト</option>
                            <option>その他</option>
                        </select>
                    </div>
                </div>
                <div class="diag-form__row">
                    <div class="diag-field">
                        <label for="dlf-budget">予算感 <span>任意</span></label>
                        <select id="dlf-budget" name="budget">
                            <option value="">選択してください</option>
                            <option>25万円〜50万円</option>
                            <option>50万円〜100万円</option>
                            <option>100万円以上</option>
                            <option>未定</option>
                        </select>
                    </div>
                    <div class="diag-field">
                        <label for="dlf-deadline">希望納期 <span>任意</span></label>
                        <select id="dlf-deadline" name="deadline">
                            <option value="">選択してください</option>
                            <option>2週間以内</option>
                            <option>1ヶ月以内</option>
                            <option>2〜3ヶ月以内</option>
                            <option>未定</option>
                        </select>
                    </div>
                </div>
                <div class="diag-field">
                    <label for="dlf-message">相談内容 <span class="diag-required">必須</span></label>
                    <textarea id="dlf-message" name="message" rows="4" placeholder="どのようなことを検討していますか？" required></textarea>
                </div>
                <label class="diag-privacy">
                    <input type="checkbox" name="privacy" required>
                    <span><a href="privacy.html" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>に同意します</span>
                </label>
                <div class="diag-form__error" id="dlf-error"></div>
                <div class="diag-actions">
                    <button type="submit" class="diag-btn-primary">AI開発診断レポートを受け取る</button>
                    <button type="button" class="diag-btn-ghost" data-back-result>← 結果に戻る</button>
                </div>
            </form>
        `;

        body.querySelector('[data-back-result]').addEventListener('click', renderResult);
        body.querySelector('#diagLeadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const company = form.company.value.trim();
            const name = form.name.value.trim();
            const email = form.email.value.trim();
            const message = form.message.value.trim();
            const err = body.querySelector('#dlf-error');
            if (!company || !name || !email || !message) { err.textContent = '必須項目をご入力ください。'; return; }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'メールアドレスの形式が正しくありません。'; return; }
            if (!form.privacy.checked) { err.textContent = 'プライバシーポリシーへの同意が必要です。'; return; }
            err.textContent = '';
            const lead = {
                company,
                name,
                email,
                budget: form.budget.value,
                deadline: form.deadline.value,
                referrer: form.referrer.value,
                message,
            };
            // 入力情報を保持（送信完了後の無料相談で再入力させないため）
            state.lead = lead;
            // PDF生成とメール送信を開始し、生成演出が終わったあとに送信結果を表示する。
            const sendPromise = generatePdf(lead, { includeContent: true })
                .then((pdf) => submitDiagnosisLead(lead, pdf))
                .then(
                    (result) => ({ ok: true, result }),
                    (error) => ({ ok: false, error })
                );
            renderGenerating(async () => {
                const outcome = await sendPromise;
                if (outcome.ok) {
                    renderThanks();
                } else {
                    console.error('diagnosis PDF mail failed', outcome.error);
                    renderSendError(outcome.error);
                }
            });
        });
    }

    const GENERATING_STEPS = [
        '回答内容を解析しています',
        '最適な開発プランを選定しています',
        '推奨技術構成を組み立てています',
        '開発提案資料を生成しています',
    ];

    function renderGenerating(onComplete = renderThanks) {
        modal.classList.add('diag-modal--generating');
        body.dataset.screen = 'generating';
        body.innerHTML = `
            <div class="diag-generating">
                <div class="diag-generating__fx" aria-hidden="true">
                    <div class="diag-generating__blob diag-generating__blob--1"></div>
                    <div class="diag-generating__blob diag-generating__blob--2"></div>
                    <div class="diag-generating__blob diag-generating__blob--3"></div>
                    <div class="diag-generating__sparkles" id="diagSparkles"></div>
                </div>
                <div class="diag-generating__content">
                    <div class="diag-generating__visual" aria-hidden="true">
                        <div class="diag-generating__orbit">
                            <span class="diag-generating__dot"></span>
                            <span class="diag-generating__dot"></span>
                            <span class="diag-generating__dot"></span>
                        </div>
                        <div class="diag-generating__core"></div>
                    </div>
                    <p class="diag-result__eyebrow">Generating</p>
                    <h3 class="diag-result__title" id="diagModalTitle">AIが診断資料を生成しています</h3>
                    <p class="diag-generating__lead">ご回答内容をもとに、最適な開発プラン・推奨技術構成・概算費用をまとめた開発提案資料を作成しています。</p>
                    <div class="diag-generating__ticker" id="diagGenTicker" aria-live="polite"></div>
                </div>
            </div>
        `;

        const sparkleHost = body.querySelector('#diagSparkles');
        if (sparkleHost) {
            const count = 12;
            let html = '';
            for (let s = 0; s < count; s++) {
                const top = Math.round(Math.random() * 100);
                const left = Math.round(Math.random() * 100);
                const size = (Math.random() * 2.4 + 1).toFixed(1);
                const delay = (Math.random() * 3).toFixed(2);
                const dur = (Math.random() * 2 + 2.2).toFixed(2);
                html += `<span class="diag-generating__sparkle" style="top:${top}%;left:${left}%;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
            }
            sparkleHost.innerHTML = html;
        }

        const ticker = body.querySelector('#diagGenTicker');
        const total = GENERATING_STEPS.length;
        const stepMs = 1100;
        const exitMs = 420;
        const timers = [];

        function showStep(i) {
            const label = GENERATING_STEPS[i];
            const chip = document.createElement('div');
            chip.className = 'diag-generating__chip is-enter';
            chip.innerHTML = `
                <span class="diag-generating__spinner" aria-hidden="true"></span>
                <span class="diag-generating__chip-label">${escapeHtml(label)}</span>
            `;
            ticker.appendChild(chip);
            requestAnimationFrame(() => {
                chip.classList.remove('is-enter');
                chip.classList.add('is-show');
            });
            timers.push(setTimeout(() => {
                chip.classList.remove('is-show');
                chip.classList.add('is-exit');
                timers.push(setTimeout(() => chip.remove(), exitMs + 60));
            }, stepMs - exitMs));
        }

        for (let i = 0; i < total; i++) {
            timers.push(setTimeout(() => showStep(i), i * stepMs));
        }
        const loopMode = /[?&]loop=1\b/.test(window.location.search);
        timers.push(setTimeout(() => {
            if (body.dataset.screen !== 'generating') return;
            if (loopMode) {
                renderGenerating(onComplete);
            } else {
                onComplete();
            }
        }, total * stepMs + 200));
    }

    function renderThanks() {
        modal.classList.remove('diag-modal--generating');
        body.dataset.screen = 'thanks';
        body.innerHTML = `
            <div class="diag-thanks">
                <div class="diag-thanks__check" aria-hidden="true">
                    <svg viewBox="0 0 52 52" width="52" height="52"><circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 27 L23 36 L39 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <p class="diag-result__eyebrow">Sent</p>
                <h3 class="diag-result__title" id="diagModalTitle">開発提案資料をメールでお送りしました</h3>
                <p class="diag-form__intro">ご回答内容をもとに作成した「開発概要・推奨技術構成・概算費用・開発ロードマップ」をまとめた資料を、ご登録のメールアドレス宛にお送りしました。届かない場合は迷惑メールフォルダもご確認ください。</p>
                <div class="diag-actions">
                    <button type="button" class="diag-btn-primary" data-contact>このまま無料相談に進む</button>
                    <button type="button" class="diag-btn-secondary" data-close-modal>閉じる</button>
                </div>
                <p class="diag-download-note">入力いただいた情報を引き継ぐので、再入力は不要です</p>
            </div>
        `;
        body.querySelector('[data-contact]').addEventListener('click', () => {
            prefillContactForm(state.lead);
            closeModal();
            requestAnimationFrame(() => {
                const contact = document.getElementById('contact');
                if (!contact) return;
                const form = contact.querySelector('form.contact-form');
                const target = form || contact;
                const header = document.querySelector('header.header');
                const offset = (header ? header.getBoundingClientRect().height : 68) + 18;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
                form?.querySelector('input[name="company"], input[name="name"], input, textarea, select')?.focus({ preventScroll: true });
            });
        });
        body.querySelector('[data-close-modal]').addEventListener('click', closeModal);
    }

    function renderSendError(error) {
        modal.classList.remove('diag-modal--generating');
        body.dataset.screen = 'send-error';
        body.innerHTML = `
            <div class="diag-thanks">
                <p class="diag-result__eyebrow">Error</p>
                <h3 class="diag-result__title" id="diagModalTitle">診断資料を送信できませんでした</h3>
                <p class="diag-form__intro">${escapeHtml(error?.message || '時間をおいて、もう一度お試しください。')}</p>
                <div class="diag-actions">
                    <button type="button" class="diag-btn-primary" data-retry-mail>もう一度送信する</button>
                    <button type="button" class="diag-btn-secondary" data-back-result>診断結果に戻る</button>
                </div>
            </div>
        `;
        body.querySelector('[data-retry-mail]').addEventListener('click', renderLeadForm);
        body.querySelector('[data-back-result]').addEventListener('click', renderResult);
    }

    /* 入力済みリード情報を問い合わせフォームに反映（再入力防止） */
    function prefillContactForm(lead) {
        if (!lead) return;
        const contact = document.getElementById('contact');
        const form = contact?.querySelector('form.contact-form');
        if (!form) return;
        ['company', 'name', 'email', 'budget', 'deadline', 'referrer', 'message'].forEach((key) => {
            const field = form.elements[key];
            const value = lead[key];
            if (field && value != null && value !== '') {
                field.value = value;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    /* ====== Lead submit / PDF ====== */
    async function submitDiagnosisLead(lead, pdf) {
        const r = state.result;
        const payload = {
            company: lead.company,
            name: lead.name,
            email: lead.email,
            category: 'AI開発診断PDF',
            subject: 'SPACE GLEAM AI開発診断PDFメール送付',
            message: [
                lead.message,
                '',
                `予算感: ${lead.budget || '未選択'}`,
                `希望納期: ${lead.deadline || '未選択'}`,
                `認知経路: ${lead.referrer || '未選択'}`,
                `推奨プラン: ${r.plan}`,
                `想定費用: ${r.cost}`,
                `想定期間: ${r.weeks}`,
                `優先度: ${r.priority}`
            ].join('\n'),
            budget: lead.budget,
            deadline: lead.deadline,
            referrer: lead.referrer,
            diagnosis: {
                answers: state.answers,
                result: r
            },
            attachment: pdf ? {
                filename: pdf.fileName,
                contentType: pdf.type,
                content: pdf.content,
                pages: pdf.pages
            } : null,
            website: '',
            recaptchaToken: await getRecaptchaToken(),
            source: 'spacegleam-diagnosis-pdf'
        };
        if (isLocalPreview()) return { skipped: true };
        const response = await fetch('/.netlify/functions/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success === false) {
            throw new Error(result?.message || '入力情報の保存に失敗しました。時間をおいて再度お試しください。');
        }
        return result || { success: true };
    }

    function getRecaptchaToken() {
        return new Promise((resolve) => {
            const siteKey = window.SPACEGLEAM_RECAPTCHA_SITE_KEY;
            if (!siteKey || !window.grecaptcha) {
                resolve('');
                return;
            }
            window.grecaptcha.ready(() => {
                window.grecaptcha.execute(siteKey, { action: 'diagnosis_pdf' })
                    .then(resolve)
                    .catch(() => resolve(''));
            });
        });
    }

    function isLocalPreview() {
        return ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    }

    function answerLabel(id, value) {
        const question = QUESTIONS.find(q => q.id === id);
        return question?.options.find(option => option.v === value)?.label || value || '-';
    }

    function productLabel(ans) {
        return answerLabel('product', ans.product);
    }

    function recommendedFeatures(ans) {
        const productFeatures = {
            efficiency: ['業務データ登録', '一覧・検索', 'ステータス管理', '通知', '集計ダッシュボード'],
            chatbot: ['チャット画面', 'FAQ・資料取り込み', 'AI回答生成', '回答履歴・評価', '利用状況ダッシュボード'],
            booking: ['予約枠管理', '予約受付', '確認・リマインド通知', '予約変更・キャンセル', '予約管理画面'],
            matching: ['プロフィール登録', '検索・絞り込み', 'マッチング申請', 'メッセージ', '運営管理画面'],
            ec: ['商品一覧・詳細', 'カート', '注文受付', '商品・在庫管理', '注文管理画面'],
            sns: ['投稿作成・予約', '投稿一覧', '分析ダッシュボード', '承認フロー', '運用管理画面'],
            other: ['主要画面', 'データ登録・編集', '一覧・検索', '管理画面', '通知']
        };
        const features = [...(productFeatures[ans.product] || productFeatures.other)];
        if (ans.auth === 'yes') features.splice(1, 0, 'ログイン・権限管理');
        if (ans.payment === 'yes') features.splice(Math.min(3, features.length), 0, '決済導線');
        return [...new Set(features)].slice(0, 8);
    }

    function techReasons(r, ans) {
        const reasons = [
            `Next.js: ${productLabel(ans)}の画面と管理画面を短期間で作り、公開後の改善もしやすくします。`,
            'Supabase: 認証、データベース、ファイル保存をまとめて扱い、初期費用を抑えます。',
            r.tech.includes('Stripe')
                ? 'Stripe: 決済、サブスク、請求管理まで拡張しやすい構成にします。'
                : '決済なし: 初期検証では決済を後回しにし、コア価値の確認を優先します。',
            'Vercel: 検証版をすばやく公開し、改善サイクルを短くします。'
        ];
        if (r.tech.includes('Claude API')) {
            reasons.splice(2, 0, 'Claude API: 回答案の生成や文章処理など、AIチャットボットの中核機能に使用します。');
        }
        if (r.tech.includes('Vector DB')) {
            reasons.splice(3, 0, 'Vector DB: 登録した資料から関連情報を検索し、回答の根拠を補強します。');
        }
        return reasons;
    }

    function roadmapItems(r, ans) {
        const features = recommendedFeatures(ans).slice(0, 5).join('、');
        return [
            `Day 1-3: 目的、対象ユーザー、成功条件を決め、MVPで作る機能を「${features}」に絞ります。`,
            'Day 4-7: 画面構成、データ項目、AIに任せる範囲、人が確認する範囲を設計します。',
            `Week 2-${r.weeksMax <= 4 ? '3' : '4'}: コア機能を実装し、社内または小規模ユーザーで触れる検証版を公開します。`,
            '公開後: 利用ログ、問い合わせ、手戻り箇所を見て、追加開発する機能と削る機能を判断します。'
        ];
    }

    function decisionPoints(ans) {
        const points = [
            '初回リリースで本当に必要な機能はどれか',
            'ユーザー登録、権限、データ管理をどこまで作るか',
            'AI出力を人が確認する運用にするか、自動化範囲を広げるか',
            '既存データや資料をどこから取り込むか'
        ];
        if (ans.payment === 'yes') points.push('決済を初期実装するか、検証後に追加するか');
        return points;
    }

    function pdfPages(lead, r, ans) {
        const features = recommendedFeatures(ans);
        const budgetGap = lead.budget
            ? `入力された予算感は「${lead.budget}」です。診断上の概算は${r.cost}のため、初回相談で機能範囲を調整します。`
            : `診断上の概算は${r.cost}です。初回相談で必須機能を絞り、費用を調整します。`;
        return [
            {
                title: '診断サマリー',
                subtitle: `${lead.company} 様向け AI開発診断レポート`,
                sections: [
                    ['結論', `${r.plan} が適しています。${r.desc}として、まずは小さく作り、使われる機能を見極める進め方をおすすめします。\n\n推奨理由: ${r.reason}`],
                    ['費用・期間', `${budgetGap}\n想定期間は${r.weeks}。希望納期は「${lead.deadline || '未選択'}」です。`],
                    ['概算の前提', r.estimateNote],
                    ['優先度', `優先度は「${r.priority}」。${answerLabel('schedule', ans.schedule)}という回答から、早めに要件を絞る価値があります。`],
                    ['回答概要', `作りたいもの: ${productLabel(ans)}\n現在の状況: ${answerLabel('stage', ans.stage)}\n想定ユーザー: ${answerLabel('users', ans.users)}\n必要機能: ${answerLabel('features', ans.features)}\nログイン: ${answerLabel('auth', ans.auth)} / 決済: ${answerLabel('payment', ans.payment)}`]
                ]
            },
            {
                title: '推奨技術構成',
                subtitle: '技術選定と役割・理由',
                sections: techReasons(r, ans).map((item) => {
                    const [heading, body] = item.split(': ');
                    return [heading, body];
                })
            },
            {
                title: '開発ロードマップ',
                subtitle: '優先順位、フェーズ、判断ポイント',
                sections: [
                    ['最初に作る機能', features.map((item, index) => `${index + 1}. ${item}`).join('\n')],
                    ['30日ロードマップ', roadmapItems(r, ans).join('\n')],
                    ['開発範囲の決め方', '「使う人が最初に価値を感じる操作」を中心に設計します。見た目を作り込む前に、登録、確認、AI処理、通知などの業務導線を固めます。'],
                    ['継続判断', '検証版を触ってもらい、利用頻度、手戻り、追加要望を見て本開発へ進むか判断します。']
                ]
            },
            {
                title: '相談用まとめ',
                subtitle: '入力情報、相談時の確認事項、次のアクション',
                sections: [
                    ['入力情報', `会社名: ${lead.company}\nお名前: ${lead.name}\nメール: ${lead.email}\n相談内容: ${lead.message}`],
                    ['相談で確認すること', decisionPoints(ans).map((item, index) => `${index + 1}. ${item}`).join('\n')],
                    ['次のアクション', '1. 目的と利用者を確認する\n2. MVPで作る機能を3〜5個に絞る\n3. 画面ラフとデータ項目を整理する\n4. 概算見積もりとスケジュールを確定する'],
                    ['SPACE GLEAMからの提案', `${r.comment}\n\n無料相談では、実装可能な範囲、費用を抑える方法、最短リリースまでの流れを具体化します。`]
                ]
            }
        ];
    }

    function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
        let currentY = y;
        String(text || '').split(/\n/).forEach(paragraph => {
            let line = '';
            Array.from(paragraph || ' ').forEach(char => {
                const next = line + char;
                if (ctx.measureText(next).width > maxWidth && line) {
                    ctx.fillText(line, x, currentY);
                    currentY += lineHeight;
                    line = char;
                } else {
                    line = next;
                }
            });
            ctx.fillText(line, x, currentY);
            currentY += lineHeight;
        });
        return currentY;
    }

    function drawRoundRect(ctx, x, y, width, height, radius) {
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, width, height, radius);
            return;
        }
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }

    function renderPdfPage(page, index) {
        const canvas = document.createElement('canvas');
        canvas.width = 1240;
        canvas.height = 1754;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, 26);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(0, 26, canvas.width, 8);
        ctx.fillStyle = '#111827';
        ctx.font = '700 52px "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
        ctx.fillText(page.title, 92, 140);
        ctx.fillStyle = '#64748b';
        ctx.font = '400 24px "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
        ctx.fillText(page.subtitle, 92, 184);
        let y = 270;
        page.sections.forEach(([heading, body]) => {
            ctx.beginPath();
            drawRoundRect(ctx, 76, y - 36, 1088, 230, 18);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#f97316';
            ctx.font = '700 28px "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
            ctx.fillText(heading, 112, y);
            ctx.fillStyle = '#111827';
            ctx.font = '400 24px "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
            const nextY = drawWrappedText(ctx, body, 112, y + 48, 1000, 36);
            y = Math.max(y + 240, nextY + 52);
        });
        ctx.fillStyle = '#64748b';
        ctx.font = '400 20px "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';
        ctx.fillText(`SPACE GLEAM AI開発診断 / ${new Date().toLocaleDateString('ja-JP')} / ${index + 1} / 4`, 92, 1684);
        return canvas;
    }

    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    async function generatePdf(lead, options = {}) {
        const r = state.result;
        const ans = state.answers;
        if (!r) throw new Error('診断結果が見つかりません。もう一度診断してください。');
        if (!window.jspdf?.jsPDF) throw new Error('PDF生成ライブラリを読み込めませんでした。時間をおいて再度お試しください。');
        const pages = pdfPages(lead, r, ans);
        if (pages.length !== 4) throw new Error('PDFページ構成の検証に失敗しました。');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pages.forEach((page, index) => {
            if (index > 0) doc.addPage('a4', 'portrait');
            const canvas = renderPdfPage(page, index);
            doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
        });
        if (doc.getNumberOfPages() !== 4) throw new Error('PDFページ数の検証に失敗しました。');
        const fileName = `spacegleam-diagnosis-${new Date().toISOString().slice(0, 10)}.pdf`;
        const result = { fileName, pages: doc.getNumberOfPages(), type: 'application/pdf' };
        if (options.includeContent) result.content = arrayBufferToBase64(doc.output('arraybuffer'));
        return result;
    }

    async function runPdfSelfCheck() {
        if (!window.jspdf?.jsPDF) return { ok: false, reason: 'jsPDF unavailable' };
        const patterns = [
            { product: 'chatbot', stage: 'idea', users: 'u100', features: 'f3', auth: 'yes', payment: 'no', schedule: 'asap' },
            { product: 'efficiency', stage: 'requirements', users: 'u1k', features: 'f5', auth: 'yes', payment: 'no', schedule: 'm1' },
            { product: 'ec', stage: 'designed', users: 'u10kup', features: 'f10', auth: 'yes', payment: 'yes', schedule: 'm3' }
        ];
        const previousAnswers = { ...state.answers };
        const previousResult = state.result;
        const checks = [];
        for (const answers of patterns) {
            state.answers = answers;
            state.result = diagnose(answers);
            const result = await generatePdf({
                company: '検証会社',
                name: '検証ユーザー',
                email: 'test@example.com',
                budget: '未定',
                deadline: '未定',
                referrer: '自動検証',
                message: 'PDF自動検証用の相談内容です。'
            }, { download: false });
            checks.push(result.pages === 4 && result.fileName.endsWith('.pdf') && result.type === 'application/pdf');
        }
        state.answers = previousAnswers;
        state.result = previousResult;
        return { ok: checks.every(Boolean), patterns: checks.length };
    }

    window.runDiagnosisPdfSelfCheck = runPdfSelfCheck;

    /* ====== Wiring ====== */
    document.addEventListener('click', (e) => {
        const opener = e.target.closest('[data-diag-open]');
        if (opener) { e.preventDefault(); openModal(); return; }
        const closer = e.target.closest('[data-diag-close]');
        if (closer) { e.preventDefault(); closeModal(); return; }
    });
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('is-open')) return;
        if (e.key !== 'Tab') return;
        const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')]
            .filter(element => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });

    if (isLocalPreview() && new URLSearchParams(window.location.search).get('diagScreen') === 'thanks') {
        requestAnimationFrame(() => {
            state.lead = {
                company: '株式会社SPACE GLEAM',
                name: '山田 太郎',
                email: 'your@email.com',
                budget: '未定',
                deadline: '未定',
                referrer: '',
                message: 'AI開発診断の確認用表示です。'
            };
            openModal();
            renderThanks();
        });
    }
})();

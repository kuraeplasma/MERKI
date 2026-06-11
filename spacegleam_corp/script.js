document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    const contactForm = document.querySelector('.contact-form');
    const formSuccess = document.querySelector('.form-success');
    const formStatus = document.querySelector('.contact-form-status');
    const recaptchaSiteKey = window.SPACEGLEAM_RECAPTCHA_SITE_KEY;

    // --- Local Server Route Helper ---
    // If running on a local static server like Python http.server,
    // ensure /blog automatically rewrites to /blog/ (with trailing slash)
    // so relative resources inside the blog page resolve correctly.
    const isLocalSimpleServer = (
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        window.location.port !== '8888' // 8888 is default Netlify Dev port, which handles redirects
    );

    if (isLocalSimpleServer) {
        document.querySelectorAll('a[href^="/"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href === '/blog' || href.startsWith('/blog#') || href.startsWith('/blog?')) {
                link.setAttribute('href', href.replace('/blog', '/blog/'));
            }
        });
    }

    // --- Booking Polish Setup ---
    const contactMethodGroup = document.getElementById('contact-method-group');
    const bookingSchedulerContainer = document.getElementById('booking-scheduler-container');
    const bookingIframe = document.getElementById('booking-iframe');
    const bookingUrl = window.SPACEGLEAM_BOOKING_URL || '';

    const urlParams = new URLSearchParams(window.location.search);
    const isBookingPolish = urlParams.get('v') === 'booking-polish';

    if (isBookingPolish && contactMethodGroup) {
        contactMethodGroup.style.display = 'grid';
    }

    if (recaptchaSiteKey) {
        const recaptchaScript = document.createElement('script');
        recaptchaScript.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKey)}`;
        recaptchaScript.async = true;
        document.head.appendChild(recaptchaScript);
    }

    const setHeaderState = () => {
        if (!header) return;
        header.classList.toggle('is-scrolled', window.scrollY > 12);
    };

    setHeaderState();
    window.addEventListener('scroll', setHeaderState, { passive: true });

    if (navToggle && nav) {
        navToggle.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('is-open');
            navToggle.classList.toggle('is-open', isOpen);
            navToggle.setAttribute('aria-expanded', String(isOpen));
            document.body.classList.toggle('nav-open', isOpen);
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const targetId = anchor.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const target = document.querySelector(targetId);
            if (!target) return;

            event.preventDefault();
            nav?.classList.remove('is-open');
            navToggle?.classList.remove('is-open');
            navToggle?.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('nav-open');

            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.12
    });

    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

    const setFormStatus = (message, type = '') => {
        if (!formStatus) return;
        formStatus.textContent = message || '';
        formStatus.classList.toggle('is-error', type === 'error');
        formStatus.classList.toggle('is-success', type === 'success');
    };

    const getRecaptchaToken = () => new Promise((resolve) => {
        if (!recaptchaSiteKey || !window.grecaptcha) {
            resolve('');
            return;
        }

        window.grecaptcha.ready(() => {
            window.grecaptcha.execute(recaptchaSiteKey, { action: 'contact' })
                .then(resolve)
                .catch(() => resolve(''));
        });
    });

    if (contactForm && formSuccess) {
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(contactForm);
            const budget = String(formData.get('budget') || '').trim();
            const deadline = String(formData.get('deadline') || '').trim();
            const referrer = String(formData.get('referrer') || '').trim();
            const message = String(formData.get('message') || '').trim();

            let meetingPref = 'text';
            if (isBookingPolish) {
                meetingPref = String(formData.get('meeting_pref') || 'schedule');
            }

            const payload = {
                company: String(formData.get('company') || '').trim(),
                name: String(formData.get('name') || '').trim(),
                email: String(formData.get('email') || '').trim(),
                category: 'AI MVP開発・無料相談',
                subject: 'SPACE GLEAM 無料相談',
                message: [
                    message,
                    '',
                    `予算感: ${budget || '未選択'}`,
                    `希望納期: ${deadline || '未選択'}`,
                    `認知経路: ${referrer || '未選択'}`
                ].join('\n'),
                budget,
                deadline,
                meeting: isBookingPolish && meetingPref === 'schedule' ? '日程調整をする' : 'フォームのみで相談',
                bookingUrl: isBookingPolish && meetingPref === 'schedule' ? bookingUrl : '',
                referrer,
                website: String(formData.get('website') || '').trim(),
                recaptchaToken: String(formData.get('recaptcha-token') || '').trim(),
                source: 'spacegleam-corp'
            };

            if (!payload.company || !payload.name || !payload.email || !payload.message) {
                setFormStatus('会社名、お名前、メールアドレス、相談内容を入力してください。', 'error');
                return;
            }

            if (!formData.get('privacy')) {
                setFormStatus('プライバシーポリシーへの同意をお願いします。', 'error');
                return;
            }

            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalLabel = submitButton?.textContent || '送信する';
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = '送信しています...';
            }
            setFormStatus('送信しています...');

            try {
                payload.recaptchaToken = await getRecaptchaToken();

                const response = await fetch('/.netlify/functions/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                let result = null;
                try {
                    result = await response.json();
                } catch (_) {
                    result = null;
                }

                if (!response.ok || result?.success === false) {
                    setFormStatus(result?.message || '送信に失敗しました。時間をおいて再度お試しください。', 'error');
                    return;
                }

                contactForm.reset();
                contactForm.classList.add('is-submitted');
                setFormStatus('');

                if (isBookingPolish && meetingPref === 'schedule' && bookingUrl && bookingIframe && bookingSchedulerContainer) {
                    bookingIframe.src = bookingUrl;
                    bookingSchedulerContainer.style.display = 'flex';
                } else if (bookingSchedulerContainer) {
                    bookingSchedulerContainer.style.display = 'none';
                }

                formSuccess.hidden = false;
                formSuccess.focus();
            } catch (_) {
                setFormStatus('送信に失敗しました。時間をおいて再度お試しください。', 'error');
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalLabel;
                }
            }
        });
    }

    // === Cinematic Volumetric Light Shafts (premium feel) ===
    const initLightShafts = (canvasId) => {
        const lightCanvas = document.getElementById(canvasId);
        if (!lightCanvas) return;

        const ctx = lightCanvas.getContext('2d');
        const container = lightCanvas.parentElement;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let width, height;

        const sizeCanvas = () => {
            if (!container) return;
            width = container.clientWidth;
            height = container.clientHeight;
            lightCanvas.width = Math.floor(width * dpr);
            lightCanvas.height = Math.floor(height * dpr);
            lightCanvas.style.width = width + 'px';
            lightCanvas.style.height = height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        sizeCanvas();
        window.addEventListener('resize', sizeCanvas);

        // Multi-layered beams. Each beam carries a *secondary* slow drift on top of the primary one,
        // and a slight color temperature offset for a richer, warmer sunlight feel.
        const beams = [
            { baseAngle: Math.PI * 0.50, angleWidth: 0.22, maxAlpha: 0.14, speed: 0.30, phase: 0.0, pulseSpeed: 0.32, pulsePhase: 0.0, drift2: 0.13, hueShift: 0   },
            { baseAngle: Math.PI * 0.43, angleWidth: 0.15, maxAlpha: 0.11, speed: 0.38, phase: 1.5, pulseSpeed: 0.41, pulsePhase: 2.1, drift2: 0.09, hueShift: -4  },
            { baseAngle: Math.PI * 0.57, angleWidth: 0.16, maxAlpha: 0.11, speed: 0.27, phase: 3.1, pulseSpeed: 0.28, pulsePhase: 0.8, drift2: 0.10, hueShift: 3   },
            { baseAngle: Math.PI * 0.37, angleWidth: 0.10, maxAlpha: 0.08, speed: 0.48, phase: 4.8, pulseSpeed: 0.52, pulsePhase: 4.3, drift2: 0.07, hueShift: -6  },
            { baseAngle: Math.PI * 0.63, angleWidth: 0.11, maxAlpha: 0.08, speed: 0.42, phase: 0.9, pulseSpeed: 0.47, pulsePhase: 1.7, drift2: 0.08, hueShift: 5   },
            { baseAngle: Math.PI * 0.50, angleWidth: 0.46, maxAlpha: 0.05, speed: 0.13, phase: 2.5, pulseSpeed: 0.18, pulsePhase: 3.5, drift2: 0.04, hueShift: 0   }
        ];

        // Dust motes drifting through the beam (rendered with screen blending feel)
        const motes = [];
        const moteCount = 38;
        for (let i = 0; i < moteCount; i++) {
            motes.push({
                x: Math.random(),         // 0-1 normalized
                y: Math.random(),
                r: 0.4 + Math.random() * 1.3,
                vx: (Math.random() - 0.5) * 0.012,
                vy: -0.005 - Math.random() * 0.012,    // mostly drifting upward
                alpha: 0.05 + Math.random() * 0.20,
                twinkleSpeed: 0.4 + Math.random() * 1.1,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }

        // Sunlight color: warm cream-white (mimics ~5500K sunlight scattered through atmosphere)
        const sunR = 255, sunG = 244, sunB = 220;

        const drawBeam = (beam, time, cx, cy, R) => {
            // No angle drift — light shafts are fixed; only intensity breathes naturally.
            const angleCenter = beam.baseAngle;
            const halfW = beam.angleWidth * 0.5;
            const a1 = angleCenter - halfW;
            const a2 = angleCenter + halfW;

            // Triple-LFO opacity pulse — feels alive, never robotic
            const pulse =
                0.55 +
                Math.sin(time * beam.pulseSpeed + beam.pulsePhase) * 0.30 +
                Math.sin(time * beam.pulseSpeed * 0.41 + beam.pulsePhase * 0.7) * 0.15;
            const alpha = Math.max(0, beam.maxAlpha * pulse);

            const r = Math.max(0, Math.min(255, sunR + beam.hueShift));
            const g = Math.max(0, Math.min(255, sunG + Math.floor(beam.hueShift * 0.5)));
            const b = Math.max(0, Math.min(255, sunB - beam.hueShift));

            // Fade-in at origin (0 alpha at source), peak mid-near, soft falloff to edge.
            // This removes the crisp "start point" of the shaft.
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
            grad.addColorStop(0.00, `rgba(${r}, ${g}, ${b}, 0)`);
            grad.addColorStop(0.06, `rgba(${r}, ${g}, ${b}, ${alpha * 0.30})`);
            grad.addColorStop(0.18, `rgba(${r}, ${g}, ${b}, ${alpha * 0.85})`);
            grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${alpha})`);
            grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${alpha * 0.55})`);
            grad.addColorStop(0.78, `rgba(${r}, ${g}, ${b}, ${alpha * 0.18})`);
            grad.addColorStop(1.00, `rgba(${r}, ${g}, ${b}, 0)`);

            // Curved wedge for feathered outer edge
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, R, a1, a2);
            ctx.closePath();

            ctx.fillStyle = grad;
            ctx.fill();
        };

        const drawSourceBloom = (cx, cy, time) => {
            // Subtle, very soft halo. NOT a bright spot at origin — fades in from 0.
            const breath = 0.85 + Math.sin(time * 0.45) * 0.10 + Math.sin(time * 0.71) * 0.05;
            const radius = Math.max(width, height) * 0.28 * breath;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            // Start fully transparent at the exact origin, very faint mid, fade to nothing.
            grad.addColorStop(0.00, 'rgba(255, 248, 230, 0)');
            grad.addColorStop(0.25, `rgba(255, 248, 230, ${0.04 * breath})`);
            grad.addColorStop(0.55, `rgba(255, 244, 220, ${0.025 * breath})`);
            grad.addColorStop(1.00, 'rgba(255, 244, 220, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
        };

        const updateMotes = (time, dt) => {
            for (const m of motes) {
                m.x += m.vx * dt;
                m.y += m.vy * dt;
                // Wrap around (motes coming from edges)
                if (m.x < -0.05) m.x = 1.05;
                if (m.x > 1.05)  m.x = -0.05;
                if (m.y < -0.05) m.y = 1.05;
                if (m.y > 1.05)  m.y = -0.05;
            }
        };

        const drawMotes = (time, cx, cy) => {
            // Only highlight motes near light center for in-beam feel
            for (const m of motes) {
                const px = m.x * width;
                const py = m.y * height;
                const dx = px - cx;
                const dy = py - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = Math.max(width, height) * 0.85;
                const proximity = Math.max(0, 1 - dist / maxDist);
                const twinkle = 0.5 + Math.sin(time * m.twinkleSpeed + m.twinklePhase) * 0.5;
                const a = m.alpha * proximity * twinkle * 0.7;
                if (a < 0.01) continue;
                ctx.beginPath();
                ctx.arc(px, py, m.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 250, 235, ${a})`;
                ctx.fill();
            }
        };

        let last = performance.now();
        const animate = (now) => {
            const time = now * 0.001;
            const dt = Math.min(0.05, (now - last) / 1000) * 16; // normalized step
            last = now;

            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            // Fixed light source — light doesn't move; only intensity breathes.
            const cx = width * 0.5;
            const cy = height * 0.44;
            const R = Math.max(width, height) * 1.35;

            drawSourceBloom(cx, cy, time);
            for (const beam of beams) drawBeam(beam, time, cx, cy, R);

            updateMotes(time, dt);
            drawMotes(time, cx, cy);

            ctx.globalCompositeOperation = 'source-over';
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    };

    initLightShafts('hero-light-shafts');
    initLightShafts('problem-light-shafts');

    // --- FAQ Accordion ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const trigger = item.querySelector('.faq-trigger');
        const content = item.querySelector('.faq-content');

        trigger.addEventListener('click', () => {
            const isActive = item.classList.contains('is-active');

            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('is-active')) {
                    otherItem.classList.remove('is-active');
                    otherItem.querySelector('.faq-content').style.maxHeight = null;
                    otherItem.querySelector('.faq-trigger').setAttribute('aria-expanded', 'false');
                }
            });

            if (isActive) {
                item.classList.remove('is-active');
                content.style.maxHeight = null;
                trigger.setAttribute('aria-expanded', 'false');
            } else {
                item.classList.add('is-active');
                content.style.maxHeight = content.scrollHeight + 'px';
                trigger.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // Initialize default active FAQ item
    const activeFaqItem = document.querySelector('.faq-item.is-active');
    if (activeFaqItem) {
        const activeContent = activeFaqItem.querySelector('.faq-content');
        if (activeContent) {
            activeContent.style.maxHeight = activeContent.scrollHeight + 'px';
        }
    }

    window.addEventListener('resize', () => {
        const activeFaq = document.querySelector('.faq-item.is-active .faq-content');
        if (activeFaq) {
            activeFaq.style.maxHeight = activeFaq.scrollHeight + 'px';
        }
    });
});

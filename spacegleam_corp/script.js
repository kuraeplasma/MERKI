document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    const contactForm = document.querySelector('.contact-form');
    const formSuccess = document.querySelector('.form-success');
    const formStatus = document.querySelector('.contact-form-status');
    const recaptchaSiteKey = window.SPACEGLEAM_RECAPTCHA_SITE_KEY;

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

    // === Dynamic Volumetric Light Shafts Effect ===
    const initLightShafts = (canvasId) => {
        const lightCanvas = document.getElementById(canvasId);
        if (!lightCanvas) return;

        const ctx = lightCanvas.getContext('2d');
        const container = lightCanvas.parentElement;

        let width = lightCanvas.width = container.clientWidth;
        let height = lightCanvas.height = container.clientHeight;

        const handleResize = () => {
            if (!container) return;
            width = lightCanvas.width = container.clientWidth;
            height = lightCanvas.height = container.clientHeight;
        };
        window.addEventListener('resize', handleResize);

        // Define multiple light beam layers with unique angles, speeds, and phases for natural overlapping
        const beams = [
            { baseAngle: Math.PI * 0.5,   angleWidth: 0.18, maxAlpha: 0.12, speed: 0.42, phase: 0.0,  pulseSpeed: 0.45, pulsePhase: 0.0 }, // Center main (more visible)
            { baseAngle: Math.PI * 0.44,  angleWidth: 0.14, maxAlpha: 0.10, speed: 0.50, phase: 1.5,  pulseSpeed: 0.55, pulsePhase: 2.1 }, // Mid left
            { baseAngle: Math.PI * 0.56,  angleWidth: 0.16, maxAlpha: 0.10, speed: 0.35, phase: 3.1,  pulseSpeed: 0.38, pulsePhase: 0.8 }, // Mid right
            { baseAngle: Math.PI * 0.38,  angleWidth: 0.10, maxAlpha: 0.08, speed: 0.65, phase: 4.8,  pulseSpeed: 0.70, pulsePhase: 4.3 }, // Far left sharp beam
            { baseAngle: Math.PI * 0.62,  angleWidth: 0.11, maxAlpha: 0.08, speed: 0.55, phase: 0.9,  pulseSpeed: 0.62, pulsePhase: 1.7 }, // Far right sharp beam
            { baseAngle: Math.PI * 0.5,   angleWidth: 0.38, maxAlpha: 0.04, speed: 0.18, phase: 2.5,  pulseSpeed: 0.25, pulsePhase: 3.5 }  // Wide ambient glow
        ];

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Light source origin coordinates aligned to the doorway in the background image
            const cx = width * 0.5;
            const cy = height * 0.44;
            const R = Math.max(width, height) * 1.3;

            beams.forEach(beam => {
                const time = Date.now() * 0.001;

                // Drift the beam angle using sine wave (further increased for clear, beautiful movement)
                const angleCenter = beam.baseAngle + Math.sin(time * beam.speed + beam.phase) * 0.14;
                const a1 = angleCenter - beam.angleWidth * 0.5;
                const a2 = angleCenter + beam.angleWidth * 0.5;

                // Pulse the opacity (deeper contrast pulse range for dynamic visibility)
                const alpha = beam.maxAlpha * (0.5 + Math.sin(time * beam.pulseSpeed + beam.pulsePhase) * 0.5);

                // Create a radial gradient from the source doorway to the screen edge
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
                grad.addColorStop(0.0, `rgba(255, 255, 255, ${alpha})`);
                grad.addColorStop(0.2, `rgba(255, 255, 255, ${alpha * 0.75})`);
                grad.addColorStop(0.6, `rgba(255, 255, 255, ${alpha * 0.25})`);
                grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

                // Draw the light cone polygon
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + R * Math.cos(a1), cy + R * Math.sin(a1));
                ctx.lineTo(cx + R * Math.cos(a2), cy + R * Math.sin(a2));
                ctx.closePath();

                ctx.fillStyle = grad;
                ctx.fill();
            });

            requestAnimationFrame(animate);
        };

        animate();
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

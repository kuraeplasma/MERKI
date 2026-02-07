import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, analytics } from './firebase-config.js?v=20260207_ButtonFix';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// --- Shared Invitation Helpers (Exported) ---

/**
 * Check and process invitation for a logged-in user.
 * Joins the user to the team if a pending invitation exists.
 */
export async function checkInvitation(user) {
    if (!user || !user.email) return;

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            // If they already have an owner_uid and it's not themselves, they are already in a team.
            if (userData.owner_uid && userData.owner_uid !== user.uid) return;

            // Check for invitation
            const inviteRef = doc(db, 'invitations', user.email);
            const inviteSnap = await getDoc(inviteRef);

            if (inviteSnap.exists() && inviteSnap.data().status === 'pending') {
                const inviteData = inviteSnap.data();
                console.log("Pending invitation found for user!", inviteData);

                // Update user doc to join the team
                await setDoc(userDocRef, {
                    owner_uid: inviteData.owner_uid,
                    owner_name: inviteData.owner_name,
                    role: inviteData.role || 'viewer',
                    subscription_status: 'team_member',
                    updated_at: serverTimestamp()
                }, { merge: true });

                // Mark invitation as accepted
                await setDoc(inviteRef, {
                    status: 'accepted',
                    joined_at: serverTimestamp()
                }, { merge: true });

                // Show Welcome Message (Store to show after potential redirect or refresh)
                localStorage.setItem('merki_welcome_owner_name', inviteData.owner_name);
                showWelcomeNotification(inviteData.owner_name);
            }
        }
    } catch (error) {
        console.error("Error checking invitation:", error);
    }
}

/**
 * Show a persistent welcome notification when joining a team.
 */
export function showWelcomeNotification(ownerName) {
    if (!ownerName) return;

    const message = `${ownerName}さんのチームに参加しました！`;

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 2rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        font-weight: 700;
        animation: slideUp 0.5s ease-out;
    `;
    toast.innerHTML = `<span>🎉</span> ${message}`;
    document.body.appendChild(toast);

    sessionStorage.setItem('merki_welcome_shown', 'true');

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-in forwards';
        setTimeout(() => toast.remove(), 500);
    }, 5000);

    // Clear from localStorage once shown
    localStorage.removeItem('merki_welcome_owner_name');
}

/**
 * Inject the shared Login/Signup Modal into the page if it doesn't exist.
 */
function injectAuthModal() {
    if (document.getElementById('login-modal')) return;

    const modalHTML = `
    <div id="login-modal" class="modal-overlay">
        <div class="modal-content merki-auth-modal">
            <button class="modal-close">&times;</button>

            <!-- Modal Header with Gradient -->
            <div class="auth-modal-header">
                <div class="auth-modal-logo">MERKI</div>
                <h3 id="modal-title" class="auth-modal-title">ログイン</h3>
                <p class="auth-modal-subtitle">制度期限管理をスマートに</p>
            </div>

            <!-- Error Message Container -->
            <div id="auth-error-msg" class="auth-error" style="display: none;"></div>

            <form id="login-form" class="auth-form">
                <div class="form-group">
                    <label class="form-label">
                        <span class="label-icon">📧</span>
                        メールアドレス
                    </label>
                    <input type="email" id="login-email" class="form-input" placeholder="example@company.com" required>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        <span class="label-icon">🔒</span>
                        パスワード
                    </label>
                    <div class="password-wrapper">
                        <input type="password" id="login-password" class="form-input" placeholder="6文字以上" required>
                        <button type="button" class="password-toggle" id="toggle-password" aria-label="パスワードを表示する">
                            <svg class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            <svg class="eye-off-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path
                                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24">
                                </path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <button type="submit" id="login-submit" class="auth-submit-btn">
                    <span class="btn-text">ログイン</span>
                    <span class="btn-arrow">→</span>
                </button>
            </form>

            <div class="auth-divider">
                <span>または</span>
            </div>

            <div class="auth-toggle">
                <span id="toggle-text" class="toggle-text">
                    アカウントをお持ちでない方は
                </span>
                <a href="#" id="toggle-auth-mode" class="toggle-link">新規登録</a>
            </div>

            <!-- Trust Indicators -->
            <div class="auth-trust-indicators">
                <div class="trust-item">
                    <span class="trust-icon">🔐</span>
                    <span class="trust-text">安全な暗号化通信</span>
                </div>
                <div class="trust-item">
                    <span class="trust-icon">🎁</span>
                    <span class="trust-text">30日間無料トライアル</span>
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Re-attach password toggle logic since we just added it to DOM
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('login-password');

    if (togglePassword && passwordInput) {
        const eyeIcon = togglePassword.querySelector('.eye-icon');
        const eyeOffIcon = togglePassword.querySelector('.eye-off-icon');

        togglePassword.addEventListener('click', (e) => {
            e.preventDefault();
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

            if (isPassword) {
                eyeIcon.style.display = 'block';
                eyeOffIcon.style.display = 'none';
            } else {
                eyeIcon.style.display = 'none';
                eyeOffIcon.style.display = 'block';
            }
        });
    }
}

// --- Main Auth Initialization ---

export function initAuth() {
    console.log("Initializing Auth v20260203_DynamicModal...");

    // Inject modal if missing
    injectAuthModal();

    // UI Elements
    const loginLink = document.getElementById('login-link');
    const signupNav = document.getElementById('signup-link');
    const signupBtns = document.querySelectorAll('.trigger-signup');
    const loginModal = document.getElementById('login-modal');

    // Modal Inner Elements
    const modalTitle = document.getElementById('modal-title');
    const loginSubmit = document.getElementById('login-submit');
    const toggleAuthMode = document.getElementById('toggle-auth-mode');
    const toggleText = document.getElementById('toggle-text');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const closeBtns = document.querySelectorAll('.modal-close');

    let isLoginMode = true;

    // --- Modal Helpers ---

    function openModal(mode) {
        if (!loginModal) return;
        loginModal.style.display = 'flex';
        isLoginMode = (mode === 'login');
        updateModalUI();
    }

    function closeModal() {
        if (loginModal) loginModal.style.display = 'none';
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
    }

    function updateModalUI() {
        const modalTitle = document.getElementById('modal-title');
        const loginSubmit = document.getElementById('login-submit');
        const toggleAuthMode = document.getElementById('toggle-auth-mode');
        const toggleText = document.getElementById('toggle-text');

        if (!modalTitle || !loginSubmit || !toggleAuthMode || !toggleText) {
            console.error('Critical Error: Modal elements not found in DOM.');
            return;
        }

        const errorMsg = document.getElementById('auth-error-msg');
        if (errorMsg) {
            errorMsg.style.display = 'none';
            errorMsg.textContent = '';
        }

        if (isLoginMode) {
            modalTitle.textContent = 'ログイン';
            loginSubmit.innerHTML = '<span class="btn-text">ログイン</span><span class="btn-arrow">→</span>';
            toggleText.textContent = 'アカウントをお持ちでない方は';
            toggleAuthMode.textContent = '新規登録';
        } else {
            modalTitle.textContent = '新規登録';
            loginSubmit.innerHTML = '<span class="btn-text">アカウント作成</span><span class="btn-arrow">→</span>';
            toggleText.textContent = 'すでにアカウントをお持ちの方は';
            toggleAuthMode.textContent = 'ログイン';
        }
    }

    function showError(message) {
        const errorMsg = document.getElementById('auth-error-msg');
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'flex';
        } else {
            alert(message);
        }
    }

    // --- State Monitor ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Legacy logic removed. CSS now handles visibility of .auth-only-in/.auth-only-out elements.

            const logoutLink = document.getElementById('logout-link');
            if (logoutLink) {
                logoutLink.onclick = async (e) => {
                    e.preventDefault();
                    // Visual Feedback
                    logoutLink.style.opacity = '0.7';
                    logoutLink.style.pointerEvents = 'none';
                    logoutLink.textContent = 'ログアウト中...';

                    localStorage.removeItem('merki_auth_active');
                    await signOut(auth);
                    window.location.reload();
                };
            }

            // Invitation logic for index.html - Run in background (non-blocking)
            checkInvitation(user).catch(err => {
                console.error('Background invitation check failed:', err);
            });

            // Redirect to dashboard if logged in and on index with invite params
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('email') && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '')) {
                console.log("Redirecting invited user to dashboard...");
                window.location.href = 'dashboard.html' + window.location.search;
            }

        } else {
            localStorage.removeItem('merki_auth_active');
            document.body.classList.remove('auth-logged-in');
            document.body.classList.add('auth-logged-out');

            // Legacy logic removed. CSS now handles visibility.
        }
    });

    // --- Event Listeners ---

    // Unified Auth Handler
    const handleAuth = async (e) => {
        if (e) e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;
        if (!email || !password) return showError('必要事項を入力してください');

        loginSubmit.disabled = true;
        const originalText = loginSubmit.innerHTML;
        loginSubmit.textContent = '処理中...';

        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                // logEvent(analytics, 'login', { method: 'email' });
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                // logEvent(analytics, 'sign_up', { method: 'email' });
            }
            closeModal();

            // Redirect to dashboard explicitly if needed
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
                if (isLoginMode) {
                    window.location.href = 'dashboard.html' + window.location.search;
                } else {
                    window.location.href = 'completed.html' + window.location.search;
                }
            }
        } catch (error) {
            console.error(error);
            let msg = '認証エラーが発生しました。';
            if (error.code === 'auth/email-already-in-use') {
                msg = 'このメールアドレスは既に登録されています。ログイン画面からお進みください。';
            } else if (error.code === 'auth/invalid-email') {
                msg = 'メールアドレスの形式が正しくありません。';
            } else if (error.code === 'auth/weak-password') {
                msg = 'パスワードは6文字以上で入力してください。';
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                msg = 'メールアドレスまたはパスワードが間違っています。';
            } else {
                msg += ' (' + error.message + ')';
            }
            showError(msg);
        } finally {
            loginSubmit.disabled = false;
            loginSubmit.innerHTML = originalText;
        }
    };

    // Attach to Form Submit (Handles both Button Click and Enter Key)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = handleAuth;
    }

    // Remove direct click handler on button to avoid conflicts
    // loginSubmit.onclick is no longer needed as type="submit" triggers form submit

    if (loginLink) {
        loginLink.onclick = (e) => {
            e.preventDefault();
            if (!auth.currentUser) openModal('login');
            else window.location.href = 'dashboard.html';
        };
    }

    if (signupNav) {
        signupNav.onclick = (e) => {
            if (!auth.currentUser) {
                e.preventDefault();
                openModal('signup');
            }
        };
    }

    // Use event delegation for dynamically added trigger-signup buttons if any,
    // but the current ones are static. Let's stick to querySelectorAll for now.
    document.querySelectorAll('.trigger-signup').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault(); // Always prevent default for javascript:void(0)
            if (!auth.currentUser) {
                openModal('signup');
            } else {
                window.location.href = 'dashboard.html';
            }
        };
    });

    toggleAuthMode.onclick = (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateModalUI();
    };

    // loginSubmit.onclick removed

    closeBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            closeModal();
        };
    });

    if (loginModal) {
        loginModal.onclick = (e) => {
            if (e.target === loginModal) closeModal();
        };
    }

    // --- Persistent Welcome Check ---
    const pendingWelcome = localStorage.getItem('merki_welcome_owner_name');
    if (pendingWelcome) {
        showWelcomeNotification(pendingWelcome);
    }

    // --- URL Parameter Handling (Invitation Flow) ---
    const urlParams = new URLSearchParams(window.location.search);
    const inviteEmail = urlParams.get('email');
    const inviteMode = urlParams.get('mode');

    if (inviteEmail) {
        if (emailInput) emailInput.value = inviteEmail;

        const isLikelyLoggedIn = localStorage.getItem('merki_auth_active') === 'true';
        if (!isLikelyLoggedIn) {
            setTimeout(() => {
                openModal('signup');
            }, 500);
        }
    }
}

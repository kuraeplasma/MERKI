import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js?v=20260127_26';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export function initAuth() {
    console.log("Initializing Auth v20260127_26...");

    // UI Elements
    const loginLink = document.getElementById('login-link');
    const signupNav = document.getElementById('signup-link'); // Nav button
    const signupBtns = document.querySelectorAll('.trigger-signup'); // Improved: Use class for all signup buttons
    const loginModal = document.getElementById('login-modal');

    // Modal Inner Elements
    const modalTitle = document.getElementById('modal-title');
    const loginSubmit = document.getElementById('login-submit');
    const toggleAuthMode = document.getElementById('toggle-auth-mode');
    const toggleText = document.getElementById('toggle-text');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const closeBtns = document.querySelectorAll('.modal-close');

    console.log("Auth System Status:", {
        time: new Date().toISOString(),
        loginLink: !!loginLink,
        signupNav: !!signupNav,
        loginModal: !!loginModal,
        signupBtnsCount: signupBtns.length,
        isLoggedIn: !!auth.currentUser
    });

    let isLoginMode = true;

    // --- Helper Functions ---

    function openModal(mode) {
        console.log("Opening Modal:", mode);
        if (!loginModal) {
            console.error("Login modal element not found!");
            return;
        }
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
        if (!modalTitle || !loginSubmit || !toggleAuthMode || !toggleText) return;

        // Clear error message when switching modes
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

    // Helper to show error
    function showError(message) {
        const errorMsg = document.getElementById('auth-error-msg');
        if (errorMsg) {
            errorMsg.textContent = message;
            errorMsg.style.display = 'flex';
        } else {
            alert(message);
        }
    }

    async function handleAuthAction() {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            showError('メールアドレスとパスワードを入力してください');
            return;
        }

        loginSubmit.disabled = true;
        const originalBtnHtml = loginSubmit.innerHTML;
        loginSubmit.textContent = '処理中...';

        try {
            if (isLoginMode) {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log("Login successful, checking profile...");

                // Check profile completion to decide redirect target
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists() && userDoc.data().company_type) {
                        window.location.href = 'dashboard.html';
                    } else {
                        window.location.href = 'profile.html';
                    }
                } catch (err) {
                    console.error("Error fetching user doc, defaulting to profile:", err);
                    window.location.href = 'profile.html';
                }
                closeModal();
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const trialEndDate = new Date();
                trialEndDate.setDate(trialEndDate.getDate() + 30);

                await setDoc(doc(db, 'users', user.uid), {
                    email: user.email,
                    plan: 'pro',
                    subscription_status: 'trial',
                    trial_end_date: trialEndDate,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp()
                });
                closeModal();
                window.location.href = 'profile.html';
            }
        } catch (error) {
            console.error("Auth error", error);
            let msg = 'エラーが発生しました。';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                msg = 'メールアドレスまたはパスワードが正しくありません。';
            } else if (error.code === 'auth/email-already-in-use') {
                msg = 'このメールアドレスは既に登録されています。';
            } else if (error.code === 'auth/weak-password') {
                msg = 'パスワードは6文字以上で設定してください。';
            }
            showError(msg);
        } finally {
            loginSubmit.disabled = false;
            loginSubmit.innerHTML = originalBtnHtml;
        }
    }

    // --- State Monitor ---
    onAuthStateChanged(auth, (user) => {
        const logoLinks = document.querySelectorAll('.logo');
        const loginNav = document.getElementById('login-link');
        const signupNav = document.getElementById('signup-link');

        if (user) {
            console.log("Verified User Session:", user.email);
            localStorage.setItem('merki_auth_active', 'true');
            document.body.classList.add('auth-logged-in');
            document.body.classList.remove('auth-logged-out');

            logoLinks.forEach(link => link.setAttribute('href', 'dashboard.html'));

            if (loginNav && signupNav) {
                loginNav.textContent = 'ダッシュボード';
                loginNav.setAttribute('href', 'dashboard.html');
                loginNav.className = 'nav-btn nav-btn-primary auth-only-in';
                loginNav.onclick = null;

                signupNav.textContent = 'ログアウト';
                signupNav.setAttribute('href', '#');
                signupNav.className = 'nav-btn nav-btn-secondary auth-only-in';
                signupNav.onclick = async (e) => {
                    e.preventDefault();
                    localStorage.removeItem('merki_auth_active');
                    await signOut(auth);
                    window.location.reload();
                };
            }
        } else {
            console.log("No Active Session");
            localStorage.removeItem('merki_auth_active');
            document.body.classList.remove('auth-logged-in');
            document.body.classList.add('auth-logged-out');

            logoLinks.forEach(link => link.setAttribute('href', 'index.html'));

            // Revert nav if needed (though usually handled by CSS for initial flicker)
            if (loginNav && signupNav) {
                loginNav.textContent = 'ログイン';
                loginNav.setAttribute('href', '#');
                loginNav.className = 'nav-btn nav-btn-secondary auth-only-out';

                signupNav.textContent = '無料で始める';
                signupNav.setAttribute('href', '#');
                signupNav.className = 'nav-btn nav-btn-primary trigger-signup auth-only-out';
            }
        }
    });

    // --- Event Listeners ---

    if (loginLink) {
        loginLink.onclick = (e) => {
            console.log("Login link clicked. Current user state:", !!auth.currentUser);
            const user = auth.currentUser;
            if (!user) {
                e.preventDefault();
                openModal('login');
            }
            // If user exists, let it follow the href (dashboard.html)
        };
    }

    // Handle all signup buttons
    signupBtns.forEach(btn => {
        btn.onclick = (e) => {
            console.log("Signup button clicked");
            e.preventDefault();
            openModal('signup');
        };
    });

    // Special case for the nav signup button if it doesn't have the class
    if (signupNav && !signupNav.classList.contains('trigger-signup')) {
        signupNav.onclick = (e) => {
            console.log("Signup nav button clicked (legacy fallback)");
            const user = auth.currentUser;
            if (!user) {
                e.preventDefault();
                openModal('signup');
            }
        };
    }

    if (toggleAuthMode) {
        toggleAuthMode.onclick = (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            updateModalUI();
        };
    }

    if (loginSubmit) {
        loginSubmit.onclick = (e) => {
            e.preventDefault();
            handleAuthAction();
        };
    }

    closeBtns.forEach((btn) => {
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
}

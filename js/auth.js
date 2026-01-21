import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';

export function initAuth() {
    console.log("Initializing Auth (Firebase)...");

    // UI Elements
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navSignupBtn = document.getElementById('nav-signup-btn');
    const authUserDisplay = document.getElementById('auth-user-display');
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

    // --- Helper Functions ---

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
        if (!modalTitle || !loginSubmit || !toggleAuthMode || !toggleText) return;

        if (isLoginMode) {
            modalTitle.textContent = 'ログイン';
            loginSubmit.textContent = 'ログイン';
            if (toggleText.firstChild) toggleText.firstChild.textContent = 'アカウントをお持ちでない方は ';
            toggleAuthMode.textContent = '新規登録';
        } else {
            modalTitle.textContent = '新規登録';
            loginSubmit.textContent = 'アカウント作成';
            if (toggleText.firstChild) toggleText.firstChild.textContent = 'すでにアカウントをお持ちの方は ';
            toggleAuthMode.textContent = 'ログイン';
        }
    }

    async function handleAuthAction() {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            alert('メールアドレスとパスワードを入力してください');
            return;
        }

        if (!isLoginMode && password.length < 6) {
            alert('パスワードは6文字以上で設定してください');
            return;
        }

        loginSubmit.disabled = true;
        loginSubmit.textContent = '処理中...';

        try {
            if (isLoginMode) {
                // Login
                await signInWithEmailAndPassword(auth, email, password);
                closeModal();
                alert('ログインしました');
            } else {
                // Sign Up
                await createUserWithEmailAndPassword(auth, email, password);
                closeModal();
                alert('アカウントを作成しました！');
            }
        } catch (error) {
            console.error("Auth error", error);
            let msg = 'エラーが発生しました。';
            if (error.code === 'auth/invalid-credential') msg = 'メールアドレスまたはパスワードが間違っています。';
            if (error.code === 'auth/email-already-in-use') msg = 'このメールアドレスは既に登録されています。';
            if (error.code === 'auth/weak-password') msg = 'パスワードが脆弱です。';
            alert(msg);
        } finally {
            loginSubmit.disabled = false;
            updateModalUI();
        }
    }

    // --- State Monitor ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Logged In
            console.log("User logged in:", user.email);

            // 1. Hide Sign Up Button
            if (navSignupBtn) navSignupBtn.style.display = 'none';

            // 2. Change Login Button to "My Page"
            if (navLoginBtn) {
                navLoginBtn.textContent = 'マイページ';
                // Remove existing click listeners by cloning (simple way) or state flag check
                // Easier: In click handler, check 'user' existence again or keep logic dynamic
            }

            // 3. User Display (Optional, but kept for clarity)
            if (authUserDisplay) {
                authUserDisplay.style.display = 'none'; // Hiding email since My Page button exists
            }
            closeModal();
        } else {
            // Logged Out
            console.log("User logged out");

            if (navSignupBtn) navSignupBtn.style.display = 'inline-block'; // Restore

            if (navLoginBtn) {
                navLoginBtn.textContent = 'ログイン';
            }
            if (authUserDisplay) {
                authUserDisplay.style.display = 'none';
            }
        }
    });

    // --- Event Listeners ---

    if (navSignupBtn) {
        navSignupBtn.onclick = (e) => {
            e.preventDefault();
            if (auth.currentUser) {
                // Should be hidden, but just in case
                window.location.href = 'mypage.html';
            } else {
                openModal('signup');
            }
        };
    }

    if (navLoginBtn) {
        navLoginBtn.onclick = async (e) => {
            e.preventDefault();
            if (auth.currentUser) {
                // Go to My Page
                window.location.href = 'mypage.html';
            } else {
                openModal('login');
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

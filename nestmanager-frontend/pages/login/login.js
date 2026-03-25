/**
 * login.js — NestManager Login Page
 */

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const API_BASE_URL = 'http://localhost:8080';
const LOGIN_ENDPOINT = `${API_BASE_URL}/api/auth/login`;
const DASHBOARD_URL = '../dashboard/dashboard.html';

/* ------------------------------------------------------------------ */
/*  If already logged in — skip login page                             */
/* ------------------------------------------------------------------ */

(function checkAlreadyLoggedIn() {
    const token = sessionStorage.getItem('nestmanager_token')
        || localStorage.getItem('nestmanager_token');
    if (token) {
        window.location.href = DASHBOARD_URL;
    }
})();

/* ------------------------------------------------------------------ */
/*  DOM References                                                      */
/* ------------------------------------------------------------------ */

const loginForm     = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const roleSelect    = document.getElementById('role');
const rememberMe    = document.getElementById('remember-me');
const loginBtn      = document.getElementById('login-btn');
const togglePassBtn = document.getElementById('toggle-pass');
const errorAlert    = document.getElementById('error-alert');
const errorMsg      = document.getElementById('error-msg');
const successAlert  = document.getElementById('success-alert');
const successMsg    = document.getElementById('success-msg');
const usernameError = document.getElementById('username-error');
const passwordError = document.getElementById('password-error');
const eyeShow       = document.querySelector('.eye-show');
const eyeHide       = document.querySelector('.eye-hide');

/* ------------------------------------------------------------------ */
/*  Password Visibility Toggle                                          */
/* ------------------------------------------------------------------ */

togglePassBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeShow.style.display = isPassword ? 'none' : 'inline';
    eyeHide.style.display = isPassword ? 'inline' : 'none';
    togglePassBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

/* ------------------------------------------------------------------ */
/*  Inline Validation                                                   */
/* ------------------------------------------------------------------ */

function showFieldError(input, errorEl, message) {
    input.classList.add('is-error');
    errorEl.textContent = message;
}

function clearFieldError(input, errorEl) {
    input.classList.remove('is-error');
    errorEl.textContent = '';
}

function validateForm() {
    let valid = true;

    const username = usernameInput.value.trim();
    if (!username) {
        showFieldError(usernameInput, usernameError, 'Username is required.');
        valid = false;
    } else if (username.length < 3) {
        showFieldError(usernameInput, usernameError, 'Username must be at least 3 characters.');
        valid = false;
    } else {
        clearFieldError(usernameInput, usernameError);
    }

    const password = passwordInput.value;
    if (!password) {
        showFieldError(passwordInput, passwordError, 'Password is required.');
        valid = false;
    } else if (password.length < 6) {
        showFieldError(passwordInput, passwordError, 'Password must be at least 6 characters.');
        valid = false;
    } else {
        clearFieldError(passwordInput, passwordError);
    }

    return valid;
}

usernameInput.addEventListener('input', () => clearFieldError(usernameInput, usernameError));
passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError));

/* ------------------------------------------------------------------ */
/*  Alert Helpers                                                       */
/* ------------------------------------------------------------------ */

function showError(message) {
    successAlert.classList.remove('show');
    errorMsg.textContent = message;
    errorAlert.classList.add('show');
}

function showSuccess(message) {
    errorAlert.classList.remove('show');
    successMsg.textContent = message;
    successAlert.classList.add('show');
}

function hideAlerts() {
    errorAlert.classList.remove('show');
    successAlert.classList.remove('show');
}

/* ------------------------------------------------------------------ */
/*  Button State                                                        */
/* ------------------------------------------------------------------ */

function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    loginBtn.classList.toggle('loading', isLoading);
}

/* ------------------------------------------------------------------ */
/*  Token & User Storage                                                */
/* ------------------------------------------------------------------ */

function getStorage() {
    return rememberMe.checked ? localStorage : sessionStorage;
}

function storeToken(token) {
    getStorage().setItem('nestmanager_token', token);
}

function storeUserRole(role) {
    getStorage().setItem('nestmanager_role', role);
}

// NEW — stores username so sidebar avatar shows correctly on all pages
function storeUsername(username) {
    getStorage().setItem('nestmanager_username', username);
}

/* ------------------------------------------------------------------ */
/*  API Call                                                            */
/* ------------------------------------------------------------------ */

async function loginRequest(username, password, role) {
    const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please try again.');
    }

    return data;   // { token, role, username, fullName }
}

/* ------------------------------------------------------------------ */
/*  Form Submit Handler                                                 */
/* ------------------------------------------------------------------ */

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlerts();

    if (!validateForm()) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const role     = roleSelect.value;

    setLoading(true);

    try {
        const data = await loginRequest(username, password, role);

        // Store token, role, and username
        storeToken(data.token);
        storeUserRole(data.role);
        storeUsername(data.username);   // ← NEW

        showSuccess('Login successful! Redirecting to dashboard...');

        setTimeout(() => {
            window.location.href = DASHBOARD_URL;
        }, 1200);

    } catch (error) {
        if (error.name === 'TypeError') {
            showError('Cannot connect to the server. Please check your connection.');
        } else {
            showError(error.message);
        }
        setLoading(false);
    }
});
/**
 * SamChat — Gestion de l'authentification côté client
 */

const Auth = (() => {
  let currentUser = null;

  function getUser() {
    return currentUser;
  }

  function showBanner(id, message) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.classList.add('is-visible');
  }

  function clearBanner(id) {
    const el = document.getElementById(id);
    el.textContent = '';
    el.classList.remove('is-visible');
  }

  async function tryRestoreSession() {
    try {
      const { user, accessToken } = await API.post('/auth/refresh');
      API.setAccessToken(accessToken);
      currentUser = user;
      return user;
    } catch (err) {
      return null;
    }
  }

  async function login(identifier, password) {
    const { user, accessToken } = await API.post('/auth/login', { identifier, password });
    API.setAccessToken(accessToken);
    currentUser = user;
    return user;
  }

  async function register({ username, email, password, displayName }) {
    const { user, accessToken } = await API.post('/auth/register', {
      username,
      email,
      password,
      displayName,
    });
    API.setAccessToken(accessToken);
    currentUser = user;
    return user;
  }

  async function logout() {
    try {
      await API.post('/auth/logout');
    } finally {
      currentUser = null;
    }
  }

  function initFormHandlers({ onAuthenticated }) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    document.getElementById('show-register').addEventListener('click', () => {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
    });

    document.getElementById('show-login').addEventListener('click', () => {
      registerForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearBanner('login-banner');
      const identifier = document.getElementById('login-identifier').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const user = await login(identifier, password);
        onAuthenticated(user);
      } catch (err) {
        showBanner('login-banner', err.message);
      }
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearBanner('register-banner');
      const displayName = document.getElementById('register-displayName').value.trim();
      const username = document.getElementById('register-username').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;

      try {
        const user = await register({ username, email, password, displayName });
        onAuthenticated(user);
      } catch (err) {
        showBanner('register-banner', err.details?.[0]?.msg || err.message);
      }
    });
  }

  return { getUser, tryRestoreSession, login, register, logout, initFormHandlers };
})();
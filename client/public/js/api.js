/**
 * SamChat — Client API REST
 * Encapsule fetch() avec gestion automatique du jeton d'accès
 * et du rafraîchissement de session.
 */

const API = (() => {
  const BASE = '/api';
  let accessToken = null;

  function setAccessToken(token) {
    accessToken = token;
  }

  function getAccessToken() {
    return accessToken;
  }

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const res = await fetch(BASE + path, {
      ...options,
      headers,
      credentials: 'include',
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }

    if (!res.ok) {
      const error = new Error(data?.error || `Erreur ${res.status}`);
      error.status = res.status;
      error.details = data?.details;
      throw error;
    }

    return data;
  }

  return {
    setAccessToken,
    getAccessToken,
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) =>
      request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
    put: (path, body) =>
      request(path, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
    del: (path) => request(path, { method: 'DELETE' }),
  };
})();
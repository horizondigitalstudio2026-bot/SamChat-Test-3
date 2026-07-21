/**
 * SamChat — Utilitaires d'interface
 */

const UI = (() => {
  function initials(name = '?') {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('');
  }

  /**
   * Crée un élément avatar : image si avatar_url disponible, sinon initiales.
   */
  function avatarEl(displayName, avatarUrl, size = 46) {
    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = displayName;
      img.className = 'avatar';
      img.style.width = size + 'px';
      img.style.height = size + 'px';
      return img;
    }
    const div = document.createElement('div');
    div.className = 'avatar';
    div.style.width = size + 'px';
    div.style.height = size + 'px';
    div.textContent = initials(displayName);
    return div;
  }

  function formatTime(dateStr) {
    const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  function escapeHtml(str = '') {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function toast(message, type = 'success') {
    const stack = document.getElementById('toast-stack');
    const el = document.createElement('div');
    el.className = `toast is-${type}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  return { initials, avatarEl, formatTime, escapeHtml, toast };
})();
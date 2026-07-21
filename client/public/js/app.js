/**
 * SamChat — Orchestration principale de l'application cliente
 */

(() => {
  const state = {
    conversations: [],
    activeConversationId: null,
    typingTimeout: null,
    typingUsers: new Map(), // conversationId -> Set(userId)
  };

  const el = {
    authScreen: document.getElementById('auth-screen'),
    appShell: document.getElementById('app-shell'),
    navAvatar: document.getElementById('nav-avatar'),
    conversationList: document.getElementById('conversation-list'),
    noChatSelected: document.getElementById('no-chat-selected'),
    activeChat: document.getElementById('active-chat'),
    chatHeaderName: document.getElementById('chat-header-name'),
    chatHeaderStatus: document.getElementById('chat-header-status'),
    chatHeaderAvatar: document.getElementById('chat-header-avatar'),
    chatHeaderPresence: document.getElementById('chat-header-presence'),
    messageList: document.getElementById('message-list'),
    composerForm: document.getElementById('composer-form'),
    composerInput: document.getElementById('composer-input'),
    sendBtn: document.getElementById('send-btn'),
    typingWrap: document.getElementById('typing-indicator-wrap'),
    newChatModal: document.getElementById('new-chat-modal'),
    userSearchInput: document.getElementById('user-search-input'),
    userSearchResults: document.getElementById('user-search-results'),
    conversationSearch: document.getElementById('conversation-search'),
    fileInput: document.getElementById('file-input'),
  };

  // ------------------------------------------------------------------
  // Démarrage
  // ------------------------------------------------------------------
  async function boot() {
    const user = await Auth.tryRestoreSession();
    if (user) {
      enterApp(user);
    } else {
      Auth.initFormHandlers({ onAuthenticated: enterApp });
    }
  }

  function enterApp(user) {
    el.authScreen.classList.add('hidden');
    el.appShell.classList.remove('hidden');
    el.navAvatar.replaceWith(UI.avatarEl(user.display_name, user.avatar_url, 42));
    el.navAvatar = document.querySelector('.nav-rail__avatar') || el.navAvatar;

    RealTime.connect(API.getAccessToken());
    bindRealtimeEvents();
    bindUiEvents();
    loadConversations();
  }

  // ------------------------------------------------------------------
  // Conversations
  // ------------------------------------------------------------------
  async function loadConversations() {
    try {
      const { conversations } = await API.get('/conversations');
      state.conversations = conversations;
      renderConversationList();
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  }

  function renderConversationList(filter = '') {
    el.conversationList.innerHTML = '';

    const filtered = state.conversations.filter((c) =>
      (c.displayName || '').toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<p>Aucune conversation pour l'instant.<br/>Lancez-en une nouvelle !</p>`;
      el.conversationList.appendChild(empty);
      return;
    }

    filtered
      .sort((a, b) => new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0))
      .forEach((conv) => {
        const item = document.createElement('button');
        item.className = 'conversation-item' + (conv.id === state.activeConversationId ? ' is-active' : '');

        const avatarWrap = document.createElement('div');
        avatarWrap.className = 'avatar-wrap';
        avatarWrap.appendChild(UI.avatarEl(conv.displayName, conv.displayAvatar, 46));
        if (conv.type === 'private' && conv.peer) {
          const dot = document.createElement('span');
          dot.className = 'presence-dot' + (conv.peer.status === 'online' ? ' is-online' : '');
          avatarWrap.appendChild(dot);
        }

        const body = document.createElement('div');
        body.className = 'conversation-item__body';
        const preview = conv.lastMessage
          ? conv.lastMessage.is_deleted
            ? 'Message supprimé'
            : conv.lastMessage.type === 'text'
            ? conv.lastMessage.content
            : `📎 ${conv.lastMessage.type}`
          : 'Démarrez la conversation';

        body.innerHTML = `
          <div class="conversation-item__top">
            <span class="conversation-item__name">${UI.escapeHtml(conv.displayName || 'Groupe')}</span>
            ${conv.lastMessage ? `<span class="conversation-item__time">${UI.formatTime(conv.lastMessage.created_at)}</span>` : ''}
          </div>
          <div class="conversation-item__preview">${UI.escapeHtml(preview || '')}</div>
        `;

        item.appendChild(avatarWrap);
        item.appendChild(body);
        item.addEventListener('click', () => openConversation(conv.id));
        el.conversationList.appendChild(item);
      });
  }

  async function openConversation(conversationId) {
    state.activeConversationId = conversationId;
    RealTime.joinConversation(conversationId);
    renderConversationList(el.conversationSearch.value);

    const conv = state.conversations.find((c) => c.id === conversationId);
    el.noChatSelected.classList.add('hidden');
    el.activeChat.classList.remove('hidden');
    el.activeChat.style.display = 'contents';
    document.getElementById('chat-panel').classList.add('is-open');
    document.querySelector('.conversation-panel').classList.add('is-chat-open');

    el.chatHeaderAvatar.replaceWith((() => {
      const av = UI.avatarEl(conv.displayName, conv.displayAvatar, 42);
      av.id = 'chat-header-avatar';
      return av;
    })());
    el.chatHeaderAvatar = document.getElementById('chat-header-avatar');
    el.chatHeaderName.textContent = conv.displayName || 'Groupe';
    el.chatHeaderPresence.classList.toggle('is-online', conv.peer?.status === 'online');
    el.chatHeaderStatus.textContent = conv.peer
      ? conv.peer.status === 'online'
        ? 'en ligne'
        : 'hors ligne'
      : `${conv.type === 'group' ? 'Groupe' : ''}`;

    await loadMessages(conversationId);
  }

  async function loadMessages(conversationId) {
    try {
      const { messages } = await API.get(`/conversations/${conversationId}/messages`);
      el.messageList.innerHTML = '';
      messages.forEach((m) => renderMessage(m));
      scrollMessagesToBottom();
      messages.forEach((m) => {
        if (m.sender_id !== Auth.getUser().id) RealTime.markDelivered(m.id);
      });
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  }

  function scrollMessagesToBottom() {
    el.messageList.scrollTop = el.messageList.scrollHeight;
  }

  function renderMessage(message) {
    const isOwn = message.sender_id === Auth.getUser().id;
    const row = document.createElement('div');
    row.className = 'message-row' + (isOwn ? ' is-own' : '');
    row.dataset.messageId = message.id;

    const bubble = document.createElement('div');

    if (message.is_deleted) {
      bubble.className = 'message-bubble is-deleted';
      bubble.textContent = 'Ce message a été supprimé';
    } else {
      bubble.className = 'message-bubble';
      if (message.type === 'text') {
        bubble.textContent = message.content;
      } else if (['image', 'video', 'audio', 'document'].includes(message.type)) {
        bubble.appendChild(renderAttachment(message));
      }
    }

    const wrapper = document.createElement('div');
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.textContent = UI.formatTime(message.created_at) + (message.is_edited ? ' · modifié' : '');

    wrapper.appendChild(bubble);
    wrapper.appendChild(meta);
    row.appendChild(wrapper);
    el.messageList.appendChild(row);
  }

  function renderAttachment(message) {
    const wrap = document.createElement('div');
    if (message.type === 'image') {
      const img = document.createElement('img');
      img.src = message.attachment_url;
      img.style.maxWidth = '260px';
      img.style.borderRadius = '12px';
      wrap.appendChild(img);
    } else if (message.type === 'video') {
      const video = document.createElement('video');
      video.src = message.attachment_url;
      video.controls = true;
      video.style.maxWidth = '260px';
      video.style.borderRadius = '12px';
      wrap.appendChild(video);
    } else if (message.type === 'audio') {
      const audio = document.createElement('audio');
      audio.src = message.attachment_url;
      audio.controls = true;
      wrap.appendChild(audio);
    } else {
      const link = document.createElement('a');
      link.href = message.attachment_url;
      link.target = '_blank';
      link.textContent = '📄 Ouvrir le document';
      link.style.textDecoration = 'underline';
      wrap.appendChild(link);
    }
    return wrap;
  }

  // ------------------------------------------------------------------
  // Composer (envoi de messages)
  // ------------------------------------------------------------------
  function bindUiEvents() {
    el.composerInput.addEventListener('input', () => {
      el.sendBtn.disabled = el.composerInput.value.trim().length === 0;
      el.composerInput.style.height = 'auto';
      el.composerInput.style.height = Math.min(el.composerInput.scrollHeight, 120) + 'px';

      if (!state.activeConversationId) return;
      RealTime.startTyping(state.activeConversationId);
      clearTimeout(state.typingTimeout);
      state.typingTimeout = setTimeout(() => RealTime.stopTyping(state.activeConversationId), 1500);
    });

    el.composerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = el.composerInput.value.trim();
      if (!content || !state.activeConversationId) return;

      try {
        await RealTime.sendMessage({ conversationId: state.activeConversationId, type: 'text', content });
        el.composerInput.value = '';
        el.composerInput.style.height = 'auto';
        el.sendBtn.disabled = true;
        RealTime.stopTyping(state.activeConversationId);
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });

    document.getElementById('attach-btn').addEventListener('click', () => el.fileInput.click());
    el.fileInput.addEventListener('change', handleFileUpload);

    document.getElementById('chat-back-btn')?.addEventListener('click', () => {
      document.getElementById('chat-panel').classList.remove('is-open');
      document.querySelector('.conversation-panel').classList.remove('is-chat-open');
    });

    // Nouvelle conversation
    document.getElementById('new-chat-btn').addEventListener('click', () => {
      el.newChatModal.classList.remove('hidden');
      el.userSearchInput.value = '';
      el.userSearchResults.innerHTML = '';
      el.userSearchInput.focus();
    });
    document.getElementById('close-new-chat-modal').addEventListener('click', () => {
      el.newChatModal.classList.add('hidden');
    });
    el.newChatModal.addEventListener('click', (e) => {
      if (e.target === el.newChatModal) el.newChatModal.classList.add('hidden');
    });

    let searchDebounce;
    el.userSearchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => searchUsers(el.userSearchInput.value.trim()), 300);
    });

    el.conversationSearch.addEventListener('input', () => renderConversationList(el.conversationSearch.value));

    document.getElementById('theme-toggle').addEventListener('click', () => {
      document.body.classList.toggle('theme-light');
    });
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file || !state.activeConversationId) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { url, mimetype } = await API.post('/upload', formData);

      const type = mimetype.startsWith('image/')
        ? 'image'
        : mimetype.startsWith('video/')
        ? 'video'
        : mimetype.startsWith('audio/')
        ? 'audio'
        : 'document';

      await RealTime.sendMessage({ conversationId: state.activeConversationId, type, attachmentUrl: url });
    } catch (err) {
      UI.toast(err.message, 'error');
    } finally {
      el.fileInput.value = '';
    }
  }

  async function searchUsers(query) {
    el.userSearchResults.innerHTML = '';
    if (query.length < 2) return;

    try {
      const { results } = await API.get(`/users/search?q=${encodeURIComponent(query)}`);
      results.forEach((user) => {
        const item = document.createElement('button');
        item.className = 'user-result';
        item.style.width = '100%';
        item.appendChild(UI.avatarEl(user.display_name, user.avatar_url, 40));
        const info = document.createElement('div');
        info.innerHTML = `<div class="user-result__name">${UI.escapeHtml(user.display_name)}</div><div class="user-result__handle">@${UI.escapeHtml(user.username)}</div>`;
        item.appendChild(info);
        item.addEventListener('click', () => startPrivateConversation(user.id));
        el.userSearchResults.appendChild(item);
      });
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  }

  async function startPrivateConversation(userId) {
    try {
      const { conversation } = await API.post('/conversations/private', { userId });
      el.newChatModal.classList.add('hidden');
      await loadConversations();
      openConversation(conversation.id);
    } catch (err) {
      UI.toast(err.message, 'error');
    }
  }

  // ------------------------------------------------------------------
  // Événements temps réel
  // ------------------------------------------------------------------
  function bindRealtimeEvents() {
    RealTime.on('message:new', (message) => {
      if (message.conversation_id === state.activeConversationId) {
        renderMessage(message);
        scrollMessagesToBottom();
        if (message.sender_id !== Auth.getUser().id) RealTime.markRead(message.id);
      }
      loadConversations();
    });

    RealTime.on('message:edited', (message) => {
      const row = document.querySelector(`[data-message-id="${message.id}"] .message-bubble`);
      if (row) row.textContent = message.content;
    });

    RealTime.on('message:deleted', (message) => {
      const row = document.querySelector(`[data-message-id="${message.id}"] .message-bubble`);
      if (row) {
        row.className = 'message-bubble is-deleted';
        row.textContent = 'Ce message a été supprimé';
      }
    });

    RealTime.on('presence:update', ({ userId, status }) => {
      const conv = state.conversations.find((c) => c.peer?.id === userId);
      if (conv) {
        conv.peer.status = status;
        if (conv.id === state.activeConversationId) {
          el.chatHeaderPresence.classList.toggle('is-online', status === 'online');
          el.chatHeaderStatus.textContent = status === 'online' ? 'en ligne' : 'hors ligne';
        }
        renderConversationList(el.conversationSearch.value);
      }
    });

    RealTime.on('typing:start', ({ conversationId, displayName }) => {
      if (conversationId !== state.activeConversationId) return;
      el.typingWrap.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    });

    RealTime.on('typing:stop', ({ conversationId }) => {
      if (conversationId !== state.activeConversationId) return;
      el.typingWrap.innerHTML = '';
    });

    RealTime.on('connect_error', (err) => {
      UI.toast('Connexion temps réel interrompue : ' + err.message, 'error');
    });
  }

  boot();
})();
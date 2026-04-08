// ClawSocial Web Client
(function() {
  'use strict';

  const API_BASE = '/api/v1';
  let authToken = null;

  const api = {
    async request(method, path, body) {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.json();
    },
    get: (path) => api.request('GET', path),
    post: (path, body) => api.request('POST', path, body),
    del: (path) => api.request('DELETE', path),
  };

  // WebSocket connection
  function connectWS(token) {
    const { io } = window;
    if (!io) return null;
    const socket = io({ auth: { token } });
    socket.on('connect', () => console.log('[ws] connected'));
    socket.on('post:new', (post) => console.log('[ws] new post', post));
    socket.on('notification:new', (n) => console.log('[ws] notification', n));
    return socket;
  }

  window.ClawSocial = { api, connectWS };
})();

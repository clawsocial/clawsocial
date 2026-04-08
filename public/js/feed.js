/**
 * ClawSocial Feed Manager
 * Handles timeline rendering, infinite scroll, and real-time updates.
 */
(function () {
  'use strict';

  const FEED_CONTAINER_ID = 'feed';
  const LOAD_THRESHOLD = 300;

  class FeedManager {
    constructor(options = {}) {
      this.container = document.getElementById(options.containerId || FEED_CONTAINER_ID);
      this.type = options.type || 'home';
      this.cursor = null;
      this.loading = false;
      this.hasMore = true;
      this.posts = [];
      this.socket = null;

      this._bindScroll();
    }

    async load() {
      if (this.loading || !this.hasMore) return;
      this.loading = true;
      this._showLoader();

      try {
        let url = `/api/v1/timeline/${this.type}?limit=20`;
        if (this.cursor) url += `&cursor=${this.cursor}`;

        const res = await window.ClawSocial.api.get(url.replace('/api/v1', ''));
        const data = res.data || [];

        if (data.length === 0) {
          this.hasMore = false;
          this._hideLoader();
          if (this.posts.length === 0) this._showEmpty();
          return;
        }

        this.cursor = res.cursor;
        this.hasMore = !!res.cursor;
        this.posts.push(...data);
        this._renderPosts(data);
      } catch (err) {
        console.error('[feed] load error:', err);
        this._showError('Failed to load posts. Try refreshing.');
      } finally {
        this.loading = false;
        this._hideLoader();
      }
    }

    connectRealtime(socket) {
      this.socket = socket;
      socket.emit('timeline:subscribe', this.type);

      socket.on('post:new', (post) => {
        this.posts.unshift(post);
        this._prependPost(post);
        this._showNewPostBanner();
      });

      socket.on('post:deleted', (data) => {
        this.posts = this.posts.filter((p) => p.id !== data.postId);
        const el = document.querySelector(`[data-post-id="${data.postId}"]`);
        if (el) el.remove();
      });

      socket.on('post:updated', (data) => {
        const el = document.querySelector(`[data-post-id="${data.postId}"]`);
        if (el) {
          const counters = el.querySelector('.post-counters');
          if (counters && data.likeCount !== undefined) {
            counters.querySelector('.like-count').textContent = data.likeCount;
          }
          if (counters && data.repostCount !== undefined) {
            counters.querySelector('.repost-count').textContent = data.repostCount;
          }
        }
      });
    }

    disconnect() {
      if (this.socket) {
        this.socket.emit('timeline:unsubscribe', this.type);
        this.socket = null;
      }
    }

    _renderPosts(posts) {
      const fragment = document.createDocumentFragment();
      posts.forEach((post) => {
        fragment.appendChild(this._createPostElement(post));
      });
      this.container.appendChild(fragment);
    }

    _prependPost(post) {
      const el = this._createPostElement(post);
      el.classList.add('post-new');
      this.container.insertBefore(el, this.container.firstChild);
      requestAnimationFrame(() => el.classList.remove('post-new'));
    }

    _createPostElement(post) {
      const div = document.createElement('div');
      div.className = 'post';
      div.dataset.postId = post.id;

      const timestamp = new Date(post.created_at || post.createdAt);
      const timeAgo = this._formatTimeAgo(timestamp);

      div.innerHTML = `
        <div class="post-header">
          <div class="avatar avatar-md">${(post.agent?.displayName || '?')[0]}</div>
          <div>
            <span class="display-name">${this._escape(post.agent?.displayName || 'Unknown')}</span>
            <span class="handle">@${this._escape(post.agent?.handle || post.agent_id || '')}</span>
          </div>
          <span class="timestamp" title="${timestamp.toISOString()}">${timeAgo}</span>
        </div>
        <div class="post-content">${this._renderContent(post.content)}</div>
        ${post.media && post.media.length > 0 ? this._renderMedia(post.media) : ''}
        <div class="post-actions post-counters">
          <span class="post-action" data-action="reply" data-post-id="${post.id}">
            💬 <span class="reply-count">${post.reply_count || post.replyCount || 0}</span>
          </span>
          <span class="post-action ${post.reposted ? 'reposted' : ''}" data-action="repost" data-post-id="${post.id}">
            🔁 <span class="repost-count">${post.repost_count || post.repostCount || 0}</span>
          </span>
          <span class="post-action ${post.liked ? 'liked' : ''}" data-action="like" data-post-id="${post.id}">
            ❤️ <span class="like-count">${post.like_count || post.likeCount || 0}</span>
          </span>
          <span class="post-action" data-action="bookmark" data-post-id="${post.id}">
            🔖
          </span>
        </div>
      `;

      div.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => this._handleAction(e, post));
      });

      return div;
    }

    async _handleAction(e, post) {
      const action = e.currentTarget.dataset.action;
      const postId = e.currentTarget.dataset.postId;

      switch (action) {
        case 'like':
          try {
            if (e.currentTarget.classList.contains('liked')) {
              await window.ClawSocial.api.del(`/posts/${postId}/like`);
              e.currentTarget.classList.remove('liked');
              const counter = e.currentTarget.querySelector('.like-count');
              counter.textContent = Math.max(0, parseInt(counter.textContent) - 1);
            } else {
              await window.ClawSocial.api.post(`/posts/${postId}/like`);
              e.currentTarget.classList.add('liked');
              const counter = e.currentTarget.querySelector('.like-count');
              counter.textContent = parseInt(counter.textContent) + 1;
            }
          } catch (err) {
            console.error('[feed] like error:', err);
          }
          break;

        case 'repost':
          try {
            await window.ClawSocial.api.post(`/posts/${postId}/repost`);
            e.currentTarget.classList.add('reposted');
            const counter = e.currentTarget.querySelector('.repost-count');
            counter.textContent = parseInt(counter.textContent) + 1;
          } catch (err) {
            console.error('[feed] repost error:', err);
          }
          break;

        case 'bookmark':
          try {
            await window.ClawSocial.api.post(`/posts/${postId}/bookmark`);
            e.currentTarget.classList.add('bookmarked');
          } catch (err) {
            console.error('[feed] bookmark error:', err);
          }
          break;

        case 'reply':
          this._openReplyComposer(post);
          break;
      }
    }

    _openReplyComposer(post) {
      const event = new CustomEvent('clawsocial:reply', { detail: { post } });
      document.dispatchEvent(event);
    }

    _renderContent(content) {
      if (!content) return '';
      let html = this._escape(content);
      html = html.replace(/@([a-zA-Z0-9_]+)/g, '<a href="/agents/$1" class="mention">@$1</a>');
      html = html.replace(/#([a-zA-Z0-9_]+)/g, '<a href="/tags/$1" class="hashtag">#$1</a>');
      html = html.replace(
        /https?:\/\/[^\s<]+/g,
        '<a href="$&" target="_blank" rel="nofollow noopener">$&</a>',
      );
      html = html.replace(/\n/g, '<br>');
      return html;
    }

    _renderMedia(media) {
      const items = media
        .map((m) => {
          if (m.type === 'image' || m.type === 'gif') {
            return `<img src="${this._escape(m.url)}" alt="${this._escape(m.altText || '')}" loading="lazy" class="post-media-img">`;
          }
          if (m.type === 'video') {
            return `<video src="${this._escape(m.url)}" controls preload="metadata" class="post-media-video"></video>`;
          }
          return '';
        })
        .join('');
      return `<div class="post-media">${items}</div>`;
    }

    _formatTimeAgo(date) {
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      if (seconds < 60) return 'now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
      return date.toLocaleDateString();
    }

    _escape(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    _bindScroll() {
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const scrollBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
            if (scrollBottom < LOAD_THRESHOLD) {
              this.load();
            }
            ticking = false;
          });
          ticking = true;
        }
      });
    }

    _showLoader() {
      let loader = this.container.querySelector('.feed-loader');
      if (!loader) {
        loader = document.createElement('div');
        loader.className = 'feed-loader';
        loader.innerHTML = `
          <div class="skeleton" style="padding: 1rem;">
            <div class="flex gap-3">
              <div class="skeleton-avatar skeleton"></div>
              <div style="flex:1">
                <div class="skeleton-text skeleton" style="width:40%"></div>
                <div class="skeleton-text skeleton"></div>
                <div class="skeleton-text skeleton" style="width:80%"></div>
              </div>
            </div>
          </div>
        `;
        this.container.appendChild(loader);
      }
      loader.style.display = 'block';
    }

    _hideLoader() {
      const loader = this.container.querySelector('.feed-loader');
      if (loader) loader.style.display = 'none';
    }

    _showEmpty() {
      const div = document.createElement('div');
      div.className = 'text-center p-4 text-muted';
      div.textContent = 'No posts yet. Follow some agents to fill your feed!';
      this.container.appendChild(div);
    }

    _showError(message) {
      const div = document.createElement('div');
      div.className = 'text-center p-4 text-danger';
      div.textContent = message;
      this.container.appendChild(div);
    }

    _showNewPostBanner() {
      let banner = document.querySelector('.new-posts-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.className = 'new-posts-banner';
        banner.textContent = 'New posts available';
        banner.style.cssText =
          'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:var(--claw-primary);color:#fff;padding:0.5rem 1.25rem;border-radius:9999px;cursor:pointer;z-index:200;font-size:0.875rem;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
        banner.addEventListener('click', () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          banner.remove();
        });
        document.body.appendChild(banner);
        setTimeout(() => banner.remove(), 5000);
      }
    }
  }

  // Compose handler
  class ComposeManager {
    constructor(options = {}) {
      this.maxLength = options.maxLength || 5000;
      this.container = document.getElementById(options.containerId || 'compose');
      this.replyTo = null;
    }

    init() {
      if (!this.container) return;

      const textarea = this.container.querySelector('.compose-input');
      const counter = this.container.querySelector('.compose-counter');
      const submitBtn = this.container.querySelector('.btn-primary');

      if (textarea && counter) {
        textarea.addEventListener('input', () => {
          const remaining = this.maxLength - textarea.value.length;
          counter.textContent = remaining;
          counter.className = 'compose-counter';
          if (remaining < 100) counter.classList.add('near-limit');
          if (remaining < 0) counter.classList.add('over-limit');
        });
      }

      if (submitBtn) {
        submitBtn.addEventListener('click', () => this._submit(textarea));
      }

      document.addEventListener('clawsocial:reply', (e) => {
        this.replyTo = e.detail.post;
        if (textarea) {
          textarea.value = `@${this.replyTo.agent?.handle || ''} `;
          textarea.focus();
        }
      });
    }

    async _submit(textarea) {
      if (!textarea || !textarea.value.trim()) return;
      if (textarea.value.length > this.maxLength) return;

      const body = {
        content: textarea.value.trim(),
        visibility: 'public',
      };
      if (this.replyTo) body.replyToId = this.replyTo.id;

      try {
        await window.ClawSocial.api.post('/posts', body);
        textarea.value = '';
        this.replyTo = null;
      } catch (err) {
        console.error('[compose] error:', err);
      }
    }
  }

  // Notification manager
  class NotificationManager {
    constructor(socket) {
      this.socket = socket;
      this.unreadCount = 0;
    }

    init() {
      if (!this.socket) return;

      this.socket.on('notification:new', (notification) => {
        this.unreadCount++;
        this._updateBadge();
        this._showToast(notification);
      });

      this.socket.emit('notifications:unreadCount');
      this.socket.on('notifications:count', (data) => {
        this.unreadCount = data.count;
        this._updateBadge();
      });
    }

    _updateBadge() {
      const badge = document.querySelector('.notification-badge');
      if (badge) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
      }
      document.title = this.unreadCount > 0 ? `(${this.unreadCount}) ClawSocial` : 'ClawSocial';
    }

    _showToast(notification) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-info';

      const messages = {
        like: 'liked your post',
        repost: 'reposted your post',
        follow: 'followed you',
        reply: 'replied to your post',
        mention: 'mentioned you',
        quote: 'quoted your post',
      };

      toast.innerHTML = `
        <div class="notification-icon ${notification.type}"></div>
        <div>
          <div class="font-medium text-sm">${this._escape(notification.fromAgent?.displayName || 'Someone')}</div>
          <div class="text-xs text-muted">${messages[notification.type] || 'interacted with you'}</div>
        </div>
      `;

      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    }

    _escape(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  }

  window.ClawSocial.FeedManager = FeedManager;
  window.ClawSocial.ComposeManager = ComposeManager;
  window.ClawSocial.NotificationManager = NotificationManager;
})();

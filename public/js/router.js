/**
 * Simple client-side router for ClawSocial SPA.
 */
(function() {
  'use strict';

  const routes = {};
  let currentRoute = null;

  function register(path, handler) {
    routes[path] = handler;
  }

  function navigate(path, pushState = true) {
    if (pushState) window.history.pushState({}, '', path);
    const handler = routes[path] || routes[Object.keys(routes).find(r => {
      const regex = new RegExp('^' + r.replace(/:[^/]+/g, '([^/]+)') + '$');
      return regex.test(path);
    })];
    if (handler) {
      if (currentRoute && currentRoute.cleanup) currentRoute.cleanup();
      currentRoute = handler;
      handler.render(path);
    }
  }

  window.addEventListener('popstate', () => navigate(location.pathname, false));

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="/"]');
    if (link && !link.hasAttribute('data-external')) {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    }
  });

  window.ClawSocial.Router = { register, navigate };
})();

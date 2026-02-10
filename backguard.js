(function () {
    try {
        if (window.__ifbEarlyBackGuardInit) return;
        window.__ifbEarlyBackGuardInit = true;

        var path = String(window.location.pathname || '/');
        if (/^\/admin(\/|$)/i.test(path)) return;
        if (/^\/api(\/|$)/i.test(path)) return;

        var state = history.state || {};
        var alreadyGuarded = (
            (state.ifb && Number(state.step || 0) >= 2) ||
            (state.ifbEarly && Number(state.step || 0) >= 2)
        );
        if (alreadyGuarded) return;

        var url = path + (window.location.search || '') + (window.location.hash || '');
        var token = String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8);

        history.replaceState({ ifbEarly: true, token: token, step: 0 }, '', url);
        history.pushState({ ifbEarly: true, token: token, step: 1 }, '', url);
        history.pushState({ ifbEarly: true, token: token, step: 2 }, '', url);
    } catch (_error) {
        // Ignore browser restrictions around History API.
    }
})();

(function () {
    try {
        if (window.__ifbEarlyBackGuardInit) return;
        window.__ifbEarlyBackGuardInit = true;

        var path = String(window.location.pathname || '/');
        if (/^\/admin(\/|$)/i.test(path)) return;
        if (/^\/api(\/|$)/i.test(path)) return;

        var url = path + (window.location.search || '') + (window.location.hash || '');
        var token = String(Date.now()) + '_' + Math.random().toString(36).slice(2, 8);
        var depth = 10;
        var refillAt = 0;

        var refill = function (force) {
            var now = Date.now();
            if (!force && (now - refillAt) < 80) return;
            refillAt = now;
            var state = history.state || {};
            var step = Number(state.step || 0);
            if (!force && state.ifbEarly === true && state.token === token && step >= depth) return;
            history.replaceState({ ifbEarly: true, token: token, step: 0 }, '', url);
            for (var i = 1; i <= depth; i += 1) {
                history.pushState({ ifbEarly: true, token: token, step: i }, '', url);
            }
        };

        refill(true);

        window.addEventListener('popstate', function () {
            if (window.__ifbAllowUnload) return;
            window.__ifbEarlyBackAttempt = true;
            refill(true);
        });

        window.addEventListener('pageshow', function () {
            if (window.__ifbAllowUnload) return;
            refill(false);
        });
    } catch (_error) {
        // Ignore browser restrictions around History API.
    }
})();

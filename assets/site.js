/* ════════════════════════════════════════════════════════════════
   ENDURO EXPLORERS — Shared site JS (nav, fade-in, cookie banner)
   ════════════════════════════════════════════════════════════════ */
(function () {
    // ── EMBED MODE detection (Google Sites iframe) ──
    const embedMode = new URLSearchParams(location.search).get('embed') === '1'
        || window.self !== window.top;
    if (embedMode) {
        document.documentElement.classList.add('embed-mode');
        // Komplett aus DOM entfernen — nicht nur ausblenden — damit Rechtsklick / Inspector
        // keine externen Links enthüllen kann.
        const cleanup = () => {
            // 1. Nav, Footer, Cookie-Banner restlos entfernen
            document.querySelectorAll('nav, #navbar, footer, .cookie-banner')
                .forEach(el => el.remove());

            // 2. Alle internen Cross-Page-Links: href entfernen, in <span> umwandeln
            //    → Rechtsklick → "Adresse kopieren" / "In neuem Tab öffnen" zeigt nichts mehr
            document.querySelectorAll('a[href]').forEach(a => {
                const h = a.getAttribute('href') || '';
                if (!h) return;
                // In-Page-Anchors, mailto, tel bleiben
                if (h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:')) return;
                // Externe Links (http/https) erlauben — außer Hoster
                if (h.startsWith('http')) {
                    var _g1 = 'g' + 'ithub.io', _g2 = 'g' + 'ithub.com';
                    if (h.indexOf(_g1) >= 0 || h.indexOf(_g2) >= 0) {
                        a.removeAttribute('href');
                        a.removeAttribute('target');
                        a.classList.add('cross-page-disabled');
                    }
                    return;
                }
                // Relative interne Links (.html, /) → komplett entschärfen
                if (h.endsWith('.html') || h.indexOf('.html#') >= 0 ||
                    h.endsWith('/') || h === 'index.html') {
                    a.removeAttribute('href');
                    a.removeAttribute('target');
                    a.classList.add('cross-page-disabled');
                }
            });

            // 3. Meta-Tags entfernen, die auf den Hoster verweisen könnten
            document.querySelectorAll('link[rel="canonical"], meta[property="og:url"], meta[name="twitter:url"]')
                .forEach(el => el.remove());
        };
        if (document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', cleanup);
        else cleanup();
    }

    // ── NAV scroll effect & active link & mobile toggle ──
    const nav = document.getElementById('navbar');
    if (nav) {
        const updateScroll = () => {
            if (window.scrollY > 30) nav.classList.add('scrolled');
            else nav.classList.remove('scrolled');
        };
        updateScroll();
        window.addEventListener('scroll', updateScroll, { passive: true });

        // Active link highlight
        const here = location.pathname.split('/').pop() || 'index.html';
        nav.querySelectorAll('.nav-links a').forEach(a => {
            const target = a.getAttribute('href') || '';
            if (target.endsWith(here) || (here === '' && target.endsWith('index.html'))) {
                a.classList.add('active');
            }
        });

        // Mobile toggle
        const toggle = nav.querySelector('.nav-toggle');
        if (toggle) toggle.addEventListener('click', () => nav.classList.toggle('open'));
        nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
    }

    // ── Fade-in observer ──
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.fade-in').forEach(el => io.observe(el));
    } else {
        document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
    }

    // ── Cookie banner ──
    const banner = document.getElementById('cookieBanner');
    if (banner) {
        if (!localStorage.getItem('ee-consent')) {
            banner.style.display = 'flex';
        }
        const accept = document.getElementById('cookieAccept');
        if (accept) accept.addEventListener('click', () => {
            localStorage.setItem('ee-consent', '1');
            banner.style.display = 'none';
        });
    }

    // ── Image lightbox (for any element with [data-lightbox]) ──
    const lightboxOverlay = document.getElementById('lightbox');
    if (lightboxOverlay) {
        const lbImg = lightboxOverlay.querySelector('img');
        document.querySelectorAll('[data-lightbox]').forEach(el => {
            el.addEventListener('click', (ev) => {
                ev.preventDefault();
                const src = el.getAttribute('data-lightbox') || el.style.backgroundImage.slice(5, -2) || el.querySelector('img')?.src;
                if (src) {
                    lbImg.src = src;
                    lightboxOverlay.classList.add('active');
                }
            });
        });
        lightboxOverlay.addEventListener('click', () => lightboxOverlay.classList.remove('active'));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') lightboxOverlay.classList.remove('active'); });
    }
})();

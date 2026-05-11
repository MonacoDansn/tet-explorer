/* ════════════════════════════════════════════════════════════════
   ENDURO EXPLORERS — Shared site JS (nav, fade-in, cookie banner)
   ════════════════════════════════════════════════════════════════ */
(function () {
    // ── EMBED MODE detection (Google Sites iframe) ──
    const embedMode = new URLSearchParams(location.search).get('embed') === '1'
        || window.self !== window.top;
    if (embedMode) {
        document.documentElement.classList.add('embed-mode');
        // Cross-page Links entschärfen — User navigiert via Google Sites
        const neutralize = () => {
            document.querySelectorAll('a[href]').forEach(a => {
                const h = a.getAttribute('href') || '';
                if (!h || h.startsWith('#') || h.startsWith('mailto:') ||
                    h.startsWith('tel:') || h.startsWith('http')) return;
                if (h.endsWith('.html') || h.includes('.html#') ||
                    h.endsWith('/') || h === 'index.html') {
                    a.classList.add('cross-page-disabled');
                    a.addEventListener('click', e => e.preventDefault());
                }
            });
        };
        if (document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', neutralize);
        else neutralize();
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

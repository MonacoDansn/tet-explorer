/* ════════════════════════════════════════════════════════════════
   ENDURO EXPLORERS — Shared site JS (nav, fade-in, cookie banner)
   ════════════════════════════════════════════════════════════════ */
(function () {
    // ── EMBED MODE detection (Google Sites iframe) ──
    const embedMode = new URLSearchParams(location.search).get('embed') === '1'
        || window.self !== window.top;
    if (embedMode) {
        document.documentElement.classList.add('embed-mode');
        // Im iframe: nur Nav/Footer/Cookie verstecken. Interne Links bleiben
        // funktional, damit User innerhalb der eingebetteten Seite navigieren können.
        const cleanup = () => {
            document.querySelectorAll('nav, #navbar, footer, .cookie-banner')
                .forEach(el => el.remove());
        };
        if (document.readyState === 'loading')
            document.addEventListener('DOMContentLoaded', cleanup);
        else cleanup();
    }

    // ── Hero-Particles (Blasen) — wie auf TET Routen Explorer ──
    function createParticles() {
        // Wenn kein Hero, kein Container nötig
        const hero = document.querySelector('.hero, .page-hero');
        if (!hero) return;
        let container = document.getElementById('particles');
        if (!container) {
            container = document.createElement('div');
            container.className = 'hero-particles';
            container.id = 'particles';
            hero.insertBefore(container, hero.firstChild);
        }
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 8 + 's';
            p.style.animationDuration = (6 + Math.random() * 6) + 's';
            const sz = (2 + Math.random() * 3) + 'px';
            p.style.width = sz;
            p.style.height = sz;
            container.appendChild(p);
        }
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', createParticles);
    else createParticles();

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

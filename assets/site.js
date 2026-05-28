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

    // ── Hero Slideshow (Foto-Rotation) — auto-init auf .hero-slideshow Containern ──
    const ALL_PHOTOS = [
        '/assets/photos/balkan-2024/03.jpg','/assets/photos/balkan-2024/04.jpg','/assets/photos/balkan-2024/05.jpg',
        '/assets/photos/balkan-2024/06.jpg','/assets/photos/balkan-2024/07.jpg','/assets/photos/balkan-2024/08.jpg',
        '/assets/photos/balkan-2024/09.jpg','/assets/photos/balkan-2024/10.jpg','/assets/photos/balkan-2024/11.jpg',
        '/assets/photos/balkan-2024/12.jpg','/assets/photos/balkan-2024/13.jpg','/assets/photos/balkan-2024/14.jpg',
        '/assets/photos/balkan-2024/15.jpg','/assets/photos/balkan-2024/16.jpg','/assets/photos/balkan-2024/17.jpg',
        '/assets/photos/marokko-2023/03.jpg','/assets/photos/marokko-2023/04.jpg','/assets/photos/marokko-2023/05.jpg',
        '/assets/photos/marokko-2023/06.jpg','/assets/photos/marokko-2023/07.jpg','/assets/photos/marokko-2023/08.jpg',
        '/assets/photos/marokko-2023/09.jpg','/assets/photos/marokko-2023/10.jpg','/assets/photos/marokko-2023/11.jpg',
        '/assets/photos/marokko-2023/12.jpg','/assets/photos/marokko-2023/13.jpg','/assets/photos/marokko-2023/14.jpg',
        '/assets/photos/marokko-2023/15.jpg','/assets/photos/marokko-2023/16.jpg','/assets/photos/marokko-2023/17.jpg',
        '/assets/photos/marokko-2023/18.jpg','/assets/photos/tunesien-2025/02.jpg','/assets/photos/tunesien-2025/03.jpg',
        '/assets/photos/tunesien-2025/04.jpg','/assets/photos/tunesien-2025/05.jpg','/assets/photos/tunesien-2025/06.jpg',
        '/assets/photos/tunesien-2025/07.jpg','/assets/photos/tunesien-2025/08.jpg','/assets/photos/tunesien-2025/09.jpg',
        '/assets/photos/tunesien-2025/10.jpg','/assets/photos/tunesien-2025/11.jpg','/assets/photos/tunesien-2025/12.jpg',
        '/assets/photos/tunesien-2025/13.jpg'
    ];

    function initHeroSlideshow() {
        const containers = document.querySelectorAll('.hero-slideshow');
        if (!containers.length) return;

        containers.forEach(container => {
            // Datensatz-Filter via data-set Attribut (z.B. data-set="tunesien-2025")
            const filter = container.dataset.set;
            let photos = ALL_PHOTOS.slice();
            if (filter && filter !== 'all') {
                photos = photos.filter(p => p.indexOf('/' + filter + '/') >= 0);
            }
            if (!photos.length) return;

            // Shuffle
            for (let i = photos.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [photos[i], photos[j]] = [photos[j], photos[i]];
            }

            // Reuse vorhandene .slide-img-Elemente oder erzeuge 2 neue
            let slideA = container.querySelector('.slide-img:nth-child(1)');
            let slideB = container.querySelector('.slide-img:nth-child(2)');
            if (!slideA) {
                slideA = document.createElement('img');
                slideA.className = 'slide-img';
                slideA.alt = '';
                container.appendChild(slideA);
            }
            if (!slideB) {
                slideB = document.createElement('img');
                slideB.className = 'slide-img';
                slideB.alt = '';
                container.appendChild(slideB);
            }

            let idx = 0;
            let activeSlide = slideA;
            let inactiveSlide = slideB;

            activeSlide.src = photos[0];
            activeSlide.onload = () => activeSlide.classList.add('active');

            setInterval(() => {
                idx = (idx + 1) % photos.length;
                inactiveSlide.src = photos[idx];
                inactiveSlide.onload = () => {
                    inactiveSlide.classList.add('active');
                    activeSlide.classList.remove('active');
                    [activeSlide, inactiveSlide] = [inactiveSlide, activeSlide];
                };
            }, 4500);
        });
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', initHeroSlideshow);
    else initHeroSlideshow();

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

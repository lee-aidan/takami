/* ------------------------------------------------------------------
   TAKAMI — shared behaviour for every page.
   Intro runs only where #intro exists (the home page); everything else
   (menu toggle, scroll reveal, logo injection) runs everywhere.
------------------------------------------------------------------ */
(function () {
    // Inject the logo-only mark into [data-mark] slots (intro + footer)
    var tpl = document.getElementById('mark');
    if (tpl) {
        document.querySelectorAll('[data-mark]').forEach(function (slot) {
            slot.appendChild(tpl.content.cloneNode(true));
        });
    }
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- Intro: home only, and only once fonts are ready ----
    var intro = document.getElementById('intro');
    if (intro && motionOK) {
        document.body.classList.add('intro-lock');
        var started = false;
        var startIntro = function () {
            if (started) return;
            started = true;
            document.body.classList.add('intro-ready');
            window.setTimeout(function () {
                document.body.classList.remove('intro-lock');
                if (intro && intro.parentNode) intro.remove();
                pokeScrollbar(1600); // pop the scrollbar once the header is fully loaded
            }, 5600);
        };
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(startIntro);
            window.setTimeout(startIntro, 1200); // fallback if fonts stall
        } else {
            startIntro();
        }
    } else if (intro) {
        intro.remove(); // reduced motion: skip the intro entirely
    }

    // ---- Menu toggle: logo <-> hamburger <-> X ----
    var toggle = document.getElementById('brandToggle');
    var menu = document.getElementById('menu');
    if (toggle && menu) {
        var setMenu = function (open) {
            toggle.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            menu.classList.toggle('is-open', open);
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
            document.body.classList.toggle('menu-open', open);
        };
        toggle.addEventListener('click', function () {
            setMenu(!toggle.classList.contains('is-open'));
        });
        menu.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () { setMenu(false); });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') setMenu(false);
        });
    }

    // ---- Scroll reveal (+ staggered children) ----
    var revealEls = document.querySelectorAll('.reveal, [data-stagger]');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                var el = e.target;
                if (el.hasAttribute('data-stagger')) {
                    [].forEach.call(el.children, function (child, i) {
                        child.style.transitionDelay = (i * 70) + 'ms';
                    });
                }
                el.classList.add('is-visible');
                io.unobserve(el);
            });
        }, { threshold: 0.12 });
        revealEls.forEach(function (el) { io.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }

    // ---- Auto-hide scrollbar: visible only while scrolling, plus a brief
    //      pop on load once the header has settled ----
    var docEl = document.documentElement;
    var sbTimer;
    function pokeScrollbar(hold) {
        docEl.classList.add('scrolling');
        window.clearTimeout(sbTimer);
        sbTimer = window.setTimeout(function () {
            docEl.classList.remove('scrolling');
        }, hold || 800);
    }
    window.addEventListener('scroll', function () { pokeScrollbar(800); }, { passive: true });
    // home pops after the intro finishes (handled above); other pages pop now
    if (!(intro && motionOK)) {
        window.setTimeout(function () { pokeScrollbar(1500); }, 300);
    }
})();

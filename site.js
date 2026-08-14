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

    // ---- Intro: home only, once per session (first load), fonts permitting ----
    var intro = document.getElementById('intro');
    var introSeen = false;
    try { introSeen = sessionStorage.getItem('tk_intro') === '1'; } catch (e) { }
    var playIntro = intro && motionOK && !introSeen;
    if (playIntro) {
        try { sessionStorage.setItem('tk_intro', '1'); } catch (e) { }
        document.body.classList.add('intro-lock');
        var started = false;
        var startIntro = function () {
            if (started) return;
            started = true;
            // Pin the logo's flight target to the REAL header mark so it lands
            // exactly where the page will show it (measuring sidesteps the
            // vw/scrollbar-gutter maths that left it a few px off).
            var brandMark = document.querySelector('.brand__mark');
            if (brandMark) {
                var r = brandMark.getBoundingClientRect();
                var rootStyle = document.documentElement.style;
                rootStyle.setProperty('--mark-x', r.left + 'px');
                rootStyle.setProperty('--mark-y', r.top + 'px');
                rootStyle.setProperty('--mark-w', r.width + 'px');
            }
            document.body.classList.add('intro-ready');
            window.setTimeout(function () {
                document.body.classList.remove('intro-lock');
                if (intro && intro.parentNode) intro.remove();
                pokeScrollbar(1600); // pop the scrollbar once the header is fully loaded
            }, 4100);
        };
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(startIntro);
            window.setTimeout(startIntro, 1200); // fallback if fonts stall
        } else {
            startIntro();
        }
    } else if (intro) {
        intro.remove(); // already seen this session (or reduced motion) — no replay
    }

    // ---- Header: transparent + line-less at the top, solidifies on scroll (all pages) ----
    var condenseHeader = function () {
        document.body.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', condenseHeader, { passive: true });
    condenseHeader();

    // ---- Page-lead: align its right border to the title's last glyph (the letter
    //      before the trailing period), so the justified copy lines up under the
    //      tagline instead of running to the full content width. ----
    var pageTitle = document.querySelector('.page-head .page-title');
    var pageLead = document.querySelector('.page-head .page-lead');
    if (pageTitle && pageLead) {
        // set the range end at the Nth rendered character within the title,
        // walking its text nodes (handles the <em> and a stray "." text node)
        var setEndAtChar = function (range, root, n) {
            var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            var seen = 0, node;
            while ((node = walker.nextNode())) {
                var len = node.nodeValue.length;
                if (seen + len >= n) { range.setEnd(node, n - seen); return true; }
                seen += len;
            }
            return false;
        };
        var fitLead = function () {
            pageLead.style.width = 'auto';
            var end = pageTitle.textContent.length;
            // drop a single trailing period and any trailing whitespace
            while (end > 0 && /[.\s]/.test(pageTitle.textContent.charAt(end - 1))) end--;
            if (end <= 0) return;
            var range = document.createRange();
            range.selectNodeContents(pageTitle);
            if (!setEndAtChar(range, pageTitle, end)) return;
            var rects = range.getClientRects();
            if (!rects.length) return;
            var lastRight = rects[rects.length - 1].right; // last line, up to that glyph
            var w = Math.round(lastRight - pageLead.getBoundingClientRect().left);
            if (w > 40) pageLead.style.width = w + 'px';
        };
        window.addEventListener('resize', fitLead);
        fitLead();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLead);
    }

    // ---- Mobile nav toggle (visible links on desktop; dropdown on small screens) ----
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
        var setNav = function (open) {
            navToggle.classList.toggle('is-open', open);
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            navLinks.classList.toggle('is-open', open);
        };
        navToggle.addEventListener('click', function () {
            setNav(!navToggle.classList.contains('is-open'));
        });
        navLinks.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () { setNav(false); });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') setNav(false);
        });
    }

    // ---- Scroll reveal (+ staggered children) ----
    var revealEls = document.querySelectorAll('.reveal, [data-stagger]');
    var doReveal = function (el) {
        if (el.classList.contains('is-visible')) return;
        if (el.hasAttribute('data-stagger')) {
            [].forEach.call(el.children, function (child, i) {
                child.style.transitionDelay = (i * 70) + 'ms';
            });
        }
        el.classList.add('is-visible');
    };
    // reveal as soon as any part enters (threshold 0), pre-revealing a little below
    // the fold (rootMargin) so a section just past the first screen appears as you
    // reach it rather than needing to be scrolled well in.
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            doReveal(e.target);
            io.unobserve(e.target);
        });
    }, { threshold: 0, rootMargin: '0px 0px 25% 0px' }) : null;

    // Deterministic pass: reveal anything already within ~1.25 screens right away, so
    // a section just below the first screen — like Our Process beneath the tall
    // orbit — is shown on arrival without waiting for the observer or a scroll.
    // Re-runnable: the orbit calls this again once its margins settle and the
    // process section has moved up into the band. (window.revealNear for that.)
    var revealNear = function () {
        var band = window.innerHeight * 1.25;
        revealEls.forEach(function (el) {
            if (el.classList.contains('is-visible')) return;
            var r = el.getBoundingClientRect();
            if (r.top < band && r.bottom > 0) { doReveal(el); if (io) io.unobserve(el); }
        });
    };
    window.revealNear = revealNear;

    if (io) {
        revealEls.forEach(function (el) { io.observe(el); });
        revealNear();
    } else {
        revealEls.forEach(doReveal);
    }

    // ---- Stats count-up: each number climbs from zero. On the first (intro)
    //      visit it fires as the intro fades out and the page fades in; on
    //      revisits (no intro) it fires when the stats scroll into view. ----
    var statNums = document.querySelectorAll('.stats dt');
    if (statNums.length && motionOK) {
        // shared clock so every number lands on its final value on the SAME frame;
        // the per-number rate is scaled to its target (bigger number counts faster)
        var countStart = null;
        var countDur = 1500;
        var countUp = function (el) {
            var m = el.textContent.trim().match(/^(\d+)(\D*)$/); // e.g. "300+"
            if (!m) return;
            var target = parseInt(m[1], 10), suffix = m[2];
            var frame = function (ts) {
                if (countStart === null) countStart = ts;
                var p = Math.min((ts - countStart) / countDur, 1);
                // floor + linear: the target is reached only at p === 1, so all
                // numbers arrive together regardless of magnitude
                el.textContent = Math.floor(p * target) + suffix;
                if (p < 1) requestAnimationFrame(frame);
            };
            el.textContent = '0' + suffix;
            requestAnimationFrame(frame);
        };
        var statsStarted = false;
        var startStats = function () {
            if (statsStarted) return;
            statsStarted = true;
            statNums.forEach(countUp);
        };

        if (playIntro && intro) {
            // start counting exactly as the intro fades out / the page fades in
            intro.addEventListener('animationstart', function (e) {
                if (e.animationName === 'introOut') startStats();
            });
            window.setTimeout(startStats, 3600); // safety net if the event is missed
        } else if ('IntersectionObserver' in window) {
            var numObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) { startStats(); numObs.disconnect(); }
                });
            }, { threshold: 0.8 });
            statNums.forEach(function (el) { numObs.observe(el); });
        } else {
            startStats();
        }
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
    // when the intro plays it pops the bar itself; otherwise pop shortly after load
    if (!playIntro) {
        window.setTimeout(function () { pokeScrollbar(1500); }, 300);
    }

    // ---- Selected Work slideshow (rotating) ----
    var show = document.querySelector('[data-slideshow]');
    if (show) {
        var slides = [].slice.call(show.querySelectorAll('.slide'));
        var total = slides.length;
        var counter = show.querySelector('[data-slideshow-counter]');
        var nameEl = show.querySelector('[data-slide-name]');
        var placeEl = show.querySelector('[data-slide-place]');
        var idx = 0, timer;
        var pad = function (n) { return ('0' + n).slice(-2); };
        var go = function (n) {
            slides[idx].classList.remove('is-active');
            idx = (n + total) % total;
            var s = slides[idx];
            s.classList.add('is-active');
            if (counter) counter.textContent = pad(idx + 1) + ' / ' + pad(total);
            if (nameEl) nameEl.textContent = s.getAttribute('data-name') || '';
            if (placeEl) placeEl.textContent = s.getAttribute('data-place') || '';
        };
        var stop = function () { window.clearInterval(timer); };
        var start = function () { stop(); if (motionOK) timer = window.setInterval(function () { go(idx + 1); }, 5000); };
        var nextBtn = show.querySelector('[data-slide-next]');
        var prevBtn = show.querySelector('[data-slide-prev]');
        if (nextBtn) nextBtn.addEventListener('click', function () { go(idx + 1); start(); });
        if (prevBtn) prevBtn.addEventListener('click', function () { go(idx - 1); start(); });
        show.addEventListener('mouseenter', stop);
        show.addEventListener('mouseleave', start);
        go(0);
        start();
    }

    // ---- Process journey: draw the winding path as the section scrolls by ----
    var journey = document.querySelector('[data-journey]');
    if (journey) {
        var line = journey.querySelector('.journey__line');
        var markers = [].slice.call(journey.querySelectorAll('.journey__marker'));
        if (line && motionOK) {
            var drawJourney = function () {
                var r = journey.getBoundingClientRect();
                var vh = window.innerHeight || document.documentElement.clientHeight;
                var p = (vh * 0.85 - r.top) / (r.height + vh * 0.55);
                p = Math.max(0, Math.min(1, p));
                // the drawn line is a div; its height IS the draw progress, so its
                // leading edge sits at exactly p·spine-height — the same reference
                // the markers use, so a circle fills precisely when the line's edge
                // reaches its centre, at any window size.
                line.style.height = (p * 100) + '%';
                for (var i = 0; i < markers.length; i++) {
                    var mr = markers[i].getBoundingClientRect();
                    var frac = (mr.top + mr.height / 2 - r.top) / r.height;
                    markers[i].classList.toggle('is-reached', p >= frac);
                }
            };
            window.addEventListener('scroll', drawJourney, { passive: true });
            window.addEventListener('resize', drawJourney);
            drawJourney();
        } else {
            markers.forEach(function (m) { m.classList.add('is-reached'); });
        }

        // ---- "Live in the bridge": size the copy to the tower legs and auto-fit
        //      the description font so each holds exactly 3 lines inside the legs.
        //      The tower is drawn center / height-scaled (1.5 * zoom * section-h),
        //      so the legs sit a fixed fraction either side of centre. Damped,
        //      because the fitted copy changes the section height (and thus where
        //      the legs land), so it settles over a few frames. ----
        var band = journey.parentNode;
        if (band && /(^|\s)process-band(\s|$)/.test(band.className || '') && motionOK) {
            var descs = [].slice.call(journey.querySelectorAll('.journey__desc'));
            var rootRem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            var maxLines = function () {
                var m = 0;
                for (var k = 0; k < descs.length; k++) {
                    var lh = parseFloat(getComputedStyle(descs[k]).lineHeight) || 1;
                    m = Math.max(m, Math.round(descs[k].getBoundingClientRect().height / lh));
                }
                return m;
            };
            var fitBridge = function () {
                var vw = window.innerWidth || document.documentElement.clientWidth;
                var bh = band.offsetHeight;
                var zoom = parseFloat(getComputedStyle(band).getPropertyValue('--tower-zoom')) || 1;
                var imgW = 1.5 * zoom * bh;          // displayed tower width
                var centre = vw / 2;                  // image + copy share the viewport centre
                var legLeft = centre - 0.075 * imgW;   // spine rail on the left tower leg
                var legRight = centre + 0.062 * imgW;  // right border on the dark right-leg edge
                var spineOff = 1.625 * rootRem;       // spine rail sits 1.625rem in from journey-left
                var padL = parseFloat(getComputedStyle(band).paddingLeft) || 0;
                var contentLeft = band.getBoundingClientRect().left + padL;
                var jLeft = legLeft - spineOff;
                journey.style.maxWidth = 'none';
                journey.style.marginRight = '0';
                journey.style.marginLeft = (jLeft - contentLeft) + 'px';
                journey.style.width = (legRight - jLeft) + 'px';
                // auto-fit: largest desc font (px) that keeps every description <= 3 lines
                var lo = 9, hi = 22, best = lo;
                for (var it = 0; it < 7; it++) {
                    var mid = (lo + hi) / 2;
                    journey.style.setProperty('--desc-fs', mid + 'px');
                    if (maxLines() <= 3) { best = mid; lo = mid; } else { hi = mid; }
                }
                journey.style.setProperty('--desc-fs', best + 'px');
                if (typeof drawJourney === 'function') drawJourney();
            };
            var settleBridge = function () {
                var n = 0;
                (function step() { fitBridge(); if (++n < 10) window.requestAnimationFrame(step); })();
            };
            settleBridge();
            window.addEventListener('resize', settleBridge);
            window.setTimeout(settleBridge, 450);
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(settleBridge);
        }
    }

    // ---- Services orbit: seamless strand scroll, centred statement, peak align ----
    // Each <textPath> holds two identical copies of its name list, so one copy is
    // getComputedTextLength()/2 — shifting startOffset by that exact period tiles the
    // run with no seam. The scroll is dt-based and the step is clamped, so a dropped
    // frame or a return from a backgrounded tab nudges forward a hair instead of
    // lurching. The statement is centred once (constant in viewBox units → never
    // re-laid-out), and the top of the arc is aligned to the heading's cap height.
    var orbit = document.querySelector('[data-orbit]');
    if (orbit) {
        var SPEED = 16;                 // viewBox units per second
        var VB_H = 500;                 // viewBox height
        var RING_CY = 250;              // ring centre (viewBox units)
        var statement = orbit.querySelector('.svc-orbit__statement');
        var topPath = orbit.querySelector('#svcTop');
        var botPath = orbit.querySelector('#svcBot');
        var heading = document.querySelector('.svc-section .section-head h2');
        var rule = document.querySelector('.page-head .hero__rule');
        var proc = document.querySelector('.process-band');

        var isHidden = function () { return window.getComputedStyle(orbit).display === 'none'; };
        var hidden = isHidden();

        // centre the whole statement as one block on the ring centre — done once, and
        // never touched again (no removeAttribute → no resize hop).
        var centered = false;
        var centreStatement = function () {
            if (centered || !statement || hidden) return;
            var bb; try { bb = statement.getBBox(); } catch (e) { return; }
            if (!bb || !bb.height) return;
            statement.setAttribute('transform',
                'translate(0,' + (RING_CY - (bb.y + bb.height / 2)).toFixed(2) + ')');
            centered = true;
        };

        // strand type metrics in viewBox units: ascent (baseline → top of the
        // letters) and descent (baseline → bottom of descenders). getBBox on a
        // straight <text> reports the font box, so -y is ascent and y+height is
        // descent. Measured once. (text-on-path getBBox is unreliable, so word tops
        // and bottoms are derived from the path apex ± these instead.)
        var ascVb = null, descVb = null;
        var measureType = function () {
            if (ascVb != null) return;
            var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('class', 'svc-orbit__strand');
            t.setAttribute('font-size', '21');
            t.setAttribute('x', '-9999'); t.setAttribute('y', '0');
            t.textContent = 'Hpgy';
            orbit.appendChild(t);
            var bb; try { bb = t.getBBox(); } catch (e) { bb = null; }
            orbit.removeChild(t);
            if (bb && bb.height) { ascVb = -bb.y; descVb = bb.y + bb.height; }
            else { ascVb = 21 * 0.98; descVb = 21 * 0.22; } // Inter fallback
        };
        var ascent = function () { measureType(); return ascVb; };
        var descent = function () { measureType(); return descVb; };

        // align the highest point of the top word-line with the cap-top of the
        // "Our Services" label. getBBox on text-on-path reports the pre-curve box, so
        // we use the PATH apex (reliable) minus the cap height as the real word top; a
        // Range gives the heading's glyph top. Self-correcting & idempotent.
        var alignPeak = function () {
            if (hidden || !heading || !topPath) return;
            var svgRect = orbit.getBoundingClientRect();
            if (!svgRect.height) return;
            var scale = svgRect.height / VB_H;
            var apexVb; try { apexVb = topPath.getBBox().y; } catch (e) { return; }
            var wordTopScreen = svgRect.top + (apexVb - ascent()) * scale;
            var capTop;
            try {
                var r = document.createRange();
                r.selectNodeContents(heading);
                capTop = r.getBoundingClientRect().top;
            } catch (e) { capTop = heading.getBoundingClientRect().top; }
            var cur = parseFloat(window.getComputedStyle(orbit).marginTop) || 0;
            orbit.style.marginTop = (cur + (capTop - wordTopScreen)).toFixed(1) + 'px';
        };

        // make the bottom word-line → process image gap equal the top word-line →
        // gray-rule gap. The knob is the orbit's bottom margin (negative pulls the
        // process section up into the orbit's empty lower band); this never touches
        // the process section's own height or the tower alignment. Runs after
        // alignPeak, so gapTop is already final. Self-correcting & idempotent.
        var balanceBottom = function () {
            if (hidden || !topPath || !botPath || !rule || !proc) return;
            var svgRect = orbit.getBoundingClientRect();
            if (!svgRect.height) return;
            var scale = svgRect.height / VB_H;
            var topWordY = svgRect.top + (topPath.getBBox().y - ascent()) * scale;
            var gapTop = topWordY - rule.getBoundingClientRect().top;
            var bb = botPath.getBBox();
            var botWordY = svgRect.top + (bb.y + bb.height + descent()) * scale;
            var gapBottom = proc.getBoundingClientRect().top - botWordY;
            var cur = parseFloat(window.getComputedStyle(orbit).marginBottom) || 0;
            orbit.style.marginBottom = (cur + (gapTop - gapBottom)).toFixed(1) + 'px';
        };

        var strands = motionOK ? [].slice.call(orbit.querySelectorAll('[data-strand]')).map(function (tp) {
            return { tp: tp, period: 0, offset: 0, dir: tp.getAttribute('data-strand') === 'top' ? 1 : -1 };
        }) : [];

        var last = 0;
        var tick = function (now) {
            var dt = last ? (now - last) / 1000 : 0;
            last = now;
            if (dt > 0.05) dt = 0.05;   // frame drop / tab resume → nudge, never lurch
            if (!hidden) {
                if (!centered) centreStatement();
                for (var i = 0; i < strands.length; i++) {
                    var s = strands[i];
                    if (!s.period) {
                        var L = s.tp.getComputedTextLength();
                        if (!L) continue;   // display:none (mobile) → measures 0, retry later
                        s.period = L / 2;
                    }
                    s.offset += s.dir * SPEED * dt;
                    s.offset %= s.period;
                    if (s.offset < 0) s.offset += s.period;
                    s.tp.setAttribute('startOffset', (s.offset - s.period).toFixed(2));
                }
            }
            window.requestAnimationFrame(tick);
        };

        // Reveal only after the orbit is measured, centred, aligned and positioned,
        // so the first thing the user sees is the finished state fading in — never the
        // un-aligned startOffset=0 paint that "jumps" when fonts finish loading.
        var started = false;
        var start = function () {
            if (started) return;
            started = true;
            centreStatement();
            alignPeak();
            balanceBottom();
            // the orbit's margins just moved the process section up into view — let
            // the reveal system re-check so it shows without needing a scroll.
            if (window.revealNear) window.revealNear();
            for (var i = 0; i < strands.length; i++) {
                var s = strands[i];
                if (!s.period) {
                    var L = s.tp.getComputedTextLength();
                    if (L) s.period = L / 2;
                }
                if (s.period) s.tp.setAttribute('startOffset', (-s.period).toFixed(2));
            }
            orbit.classList.add('is-ready');
            if (motionOK) window.requestAnimationFrame(tick);
        };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
        window.setTimeout(start, 1500); // defensive: reveal even if fonts.ready stalls

        // a late font swap would change glyph advances: re-measure the period but keep
        // the current visual phase (frac), so nothing jumps; then re-align the peak.
        window.addEventListener('load', function () {
            for (var i = 0; i < strands.length; i++) {
                var s = strands[i];
                if (!s.period) continue;
                var L = s.tp.getComputedTextLength();
                if (L && Math.abs(L / 2 - s.period) > 0.5) {
                    var frac = s.offset / s.period;
                    s.period = L / 2;
                    s.offset = frac * s.period;
                }
            }
            alignPeak();
            balanceBottom();
        });

        var reflow;
        window.addEventListener('resize', function () {
            hidden = isHidden();
            centreStatement();
            window.clearTimeout(reflow);
            reflow = window.setTimeout(function () { alignPeak(); balanceBottom(); }, 120);
        });
    }

    // ---- Our difference: fit the copy to the statement, + map spotlight ----
    var diff = document.querySelector('[data-difference]');
    if (diff) {
        var stmt = diff.querySelector('.lead-statement');
        var copy = diff.querySelector('.lead-copy');
        var permEm = stmt && stmt.querySelector('em');
        var fitCopy = function () {
            if (!stmt || !copy || !permEm) return;
            if (window.matchMedia('(max-width: 1080px)').matches) { copy.style.width = ''; return; }
            // width up to the right edge of "permitted" (the d), minus the period
            copy.style.width = (permEm.getBoundingClientRect().right - stmt.getBoundingClientRect().left) + 'px';
        };
        fitCopy();
        window.addEventListener('resize', fitCopy);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCopy);
    }

    // Bay Area map: sharpen the ghosted map under the pointer (cheap — one mask,
    // two shared-URL layers, no per-region work).
    var diffMap = document.querySelector('[data-map]');
    if (diffMap && motionOK) {
        diffMap.addEventListener('pointermove', function (e) {
            var r = diffMap.getBoundingClientRect();
            diffMap.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            diffMap.style.setProperty('--my', (e.clientY - r.top) + 'px');
            diffMap.classList.add('is-live');
        });
        diffMap.addEventListener('pointerleave', function () {
            diffMap.classList.remove('is-live');
        });
    }

    // ---- About: widen each prose block so its right edge meets "Work" in the nav.
    // (Above the split's stacking width only; cleared when stacked.) ----
    var aboutProses = document.querySelectorAll('.split .prose');
    if (aboutProses.length) {
        var workLink = null;
        var navAnchors = document.querySelectorAll('.nav__links a');
        for (var wi = 0; wi < navAnchors.length; wi++) {
            if (navAnchors[wi].textContent.trim() === 'Work') { workLink = navAnchors[wi]; break; }
        }
        var fitAbout = function () {
            if (!workLink) return;
            if (window.matchMedia('(max-width: 860px)').matches) {
                for (var i = 0; i < aboutProses.length; i++) aboutProses[i].style.width = '';
                return;
            }
            var workRight = workLink.getBoundingClientRect().right;
            for (var j = 0; j < aboutProses.length; j++) {
                var p = aboutProses[j];
                p.style.width = '';
                var w = workRight - p.getBoundingClientRect().left;
                if (w > 0) p.style.width = w + 'px';
            }
        };
        window.addEventListener('resize', fitAbout);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAbout);
        fitAbout();
    }

    // ---- Contact form: front-end confirmation (backend wired later) ----
    // Native `required` validation blocks an invalid submit before this fires;
    // once a form service (Formspree / Netlify) is added, POST here first.
    var contactForm = document.querySelector('[data-form]');
    if (contactForm) {
        var formSent = document.querySelector('[data-form-sent]');
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (formSent) {
                contactForm.hidden = true;
                formSent.hidden = false;
                formSent.scrollIntoView({
                    behavior: motionOK ? 'smooth' : 'auto',
                    block: 'center'
                });
            }
        });
    }
})();

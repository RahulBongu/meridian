/* ============================================================
   MERIDIAN — interactions
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const pad = (n) => String(n).padStart(2, "0");

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  /* ---------------- Loader ---------------- */
  const loader = $("#loader");
  const loaderBar = $("#loaderBar");
  const hero = $("#hero");
  let loaderDone = false;

  const finishLoader = () => {
    if (loaderDone) return;
    loaderDone = true;
    if (loaderBar) loaderBar.style.transform = "scaleX(1)";
    setTimeout(() => {
      if (loader) loader.classList.add("is-done");
      hero.classList.add("is-ready");
      document.body.classList.add("is-loaded");
    }, 400);
    setTimeout(() => loader && loader.remove(), 2000);
    window.scrollTo(0, 0);
  };
  if (loaderBar) loaderBar.style.transform = "scaleX(0.35)";
  if (document.readyState === "complete") finishLoader();
  else window.addEventListener("load", finishLoader, { once: true });
  setTimeout(finishLoader, 5000); // safety net

  /* ---------------- Hero: video time-lapse (with image fast-cut fallback) ---------------- */
  const slides = $$(".hero__timelapse img");
  const heroEl = $("#hero");
  const video = $("#heroVideo");
  let current = 0;
  const SLIDE_DUR = 750; // fast-cut time-lapse rhythm for the fallback
  let heroTimer = null;

  const setSlide = (i) => {
    slides[current].classList.remove("is-active");
    slides[i].classList.add("is-active");
    current = i;
  };

  const stopFallback = () => {
    clearInterval(heroTimer);
    heroTimer = null;
  };

  const startFallback = () => {
    if (heroTimer || !slides.length || prefersReduced) return;
    heroEl.classList.add("hero--timelapse");
    setSlide(0);
    heroTimer = setInterval(() => setSlide((current + 1) % slides.length), SLIDE_DUR);
  };

  if (video && slides.length) {
    const tryVideo = () => {
      video.classList.add("can-play");
      heroEl.classList.remove("hero--timelapse");
      stopFallback();
      video.muted = true; // keep autoplay guarantees after programmatic play()
      video.play().catch(() => startFallback());
    };

    video.addEventListener("canplay", tryVideo, { once: true });
    video.addEventListener("error", () => startFallback(), true); // capture <source> failures
    if (video.readyState >= 3) tryVideo();
    else if (video.readyState === 0 && video.networkState === 3) startFallback();
  } else {
    startFallback();
  }

  // Long stall (offline / hung request) — give up on video, cut to the fallback
  setTimeout(() => { if (video && video.readyState < 3 && !heroTimer) startFallback(); }, 7000);

  /* ---------------- Custom cursor ---------------- */

  const cursor = $("#cursor");
  if (cursor && !isCoarse && !prefersReduced) {
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    let visible = false;

    addEventListener("mousemove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) { visible = true; cursor.classList.add("is-visible"); }
      const t = e.target;
      if (t.closest && t.closest("[data-cursor='view']")) cursor.classList.add("is-active");
      else cursor.classList.remove("is-active");
    }, { passive: true });

    document.addEventListener("mouseleave", () => {
      visible = false;
      cursor.classList.remove("is-visible");
    });

    (function raf() {
      cx = lerp(cx, tx, 0.18);
      cy = lerp(cy, ty, 0.18);
      cursor.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) translate(-50%, -50%)`;
      requestAnimationFrame(raf);
    })();
  }

  /* ---------------- Nav ---------------- */
  const nav = $("#nav");
  let lastY = 0;
  let menuOpen = false;

  const onScrollNav = () => {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > 480 && y > lastY && !menuOpen);
    lastY = y;
  };
  addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ---------------- Mobile menu ---------------- */
  const burger = $("#burger");
  const menu = $("#menu");

  const setMenu = (open) => {
    menuOpen = open;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", String(!open));
    menu.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (open) nav.classList.remove("is-hidden");
  };
  burger.addEventListener("click", () => setMenu(!menuOpen));
  $$("#menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------------- Magnetic buttons ---------------- */
  if (!isCoarse && !prefersReduced) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transition = "transform .25s cubic-bezier(.22,1,.36,1)";
        el.style.transform = `translate(${(dx * 0.28).toFixed(1)}px, ${(dy * 0.28).toFixed(1)}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform .7s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "translate(0, 0)";
        setTimeout(() => (el.style.transition = ""), 700);
      });
    });
  }

  /* ---------------- Scroll reveals ---------------- */
  const revealables = () => $$(".reveal, .reveal-lines, .reveal-media, .step");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("in-view");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
  revealables().forEach((el) => io.observe(el));

  // Elements already in view when the page loads (below the loader)
  document.addEventListener("DOMContentLoaded", () => {});
  const primeReveals = () => {
    revealables().forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add("in-view");
    });
  };
  window.addEventListener("load", primeReveals);

  /* ---------------- Counters ---------------- */
  const counters = $$("[data-count]");
  const countUp = (el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || "";
    if (prefersReduced) { el.textContent = target + suffix; return; }
    const dur = 1900;
    const start = performance.now();
    const tick = (now) => {
      const p = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (counters.length) {
    const cio = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); }
    }), { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------------- Parallax (intro, cine, CTA) ---------------- */
  const parallaxImgs = $$(".parallax-img, .parallax-img-sm, .parallax-cine");
  const smoothParallax = () => {
    if (prefersReduced) return;
    const vh = innerHeight;
    parallaxImgs.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const center = r.top + r.height / 2;
      const rel = (center - vh / 2) / vh; // ~ -1..1
      const depth = el.classList.contains("parallax-cine") ? 55
        : el.classList.contains("parallax-img-sm") ? 30 : 45;
      const ty = clamp(rel * depth, -140, 140);
      el.querySelectorAll("img").forEach((img) => {
        img.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)`;
      });
    });
  };

  /* ---------------- Horizontal showcase ---------------- */
  const showcase = $(".showcase");
  const track = $("#showcaseTrack");
  const progress = $("#showcaseProgress");
  let pinStart = 0;
  let pinEnd = 0;
  const isHorizontal = () => showcase && getComputedStyle(track).flexDirection === "row";

  const measureShowcase = () => {
    if (!showcase || !track) return;
    pinStart = showcase.offsetTop;
    pinEnd = pinStart + showcase.offsetHeight - innerHeight;
  };

  const updateShowcase = () => {
    if (!isHorizontal()) { track.style.transform = ""; return; }
    const y = scrollY;
    const p = clamp((y - pinStart) / Math.max(1, pinEnd - pinStart), 0, 1);
    const maxShift = track.scrollWidth - innerWidth;
    track.style.transform = `translate3d(${(-p * maxShift).toFixed(1)}px, 0, 0)`;
    if (progress) progress.style.transform = `scaleX(${p.toFixed(3)})`;
  };

  /* ---------------- Testimonials ---------------- */
  const quotes = $$(".quote");
  const quoteIdxEl = $("#quoteIdx");
  let qi = 0;
  let quoteTimer = null;

  const showQuote = (i) => {
    quotes[qi].classList.remove("is-active");
    qi = (i + quotes.length) % quotes.length;
    quotes[qi].classList.add("is-active");
    if (quoteIdxEl) quoteIdxEl.textContent = pad(qi + 1);
  };
  const quoteAuto = () => {
    clearInterval(quoteTimer);
    quoteTimer = setInterval(() => showQuote(qi + 1), 7000);
  };
  $("#quotePrev").addEventListener("click", () => { showQuote(qi - 1); quoteAuto(); });
  $("#quoteNext").addEventListener("click", () => { showQuote(qi + 1); quoteAuto(); });
  quoteAuto();

  /* ---------------- Unified scroll loop ---------------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      smoothParallax();
      updateShowcase();
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });

  const onResize = () => {
    measureShowcase();
    smoothParallax();
    updateShowcase();
  };
  addEventListener("resize", onResize);
  addEventListener("load", () => { measureShowcase(); onScroll(); });
  measureShowcase();
})();

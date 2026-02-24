/**
 * ============================================================
 *  MENU.JS — Drawer, theme, font loading, slideshow engine
 * ============================================================
 */
(function () {
  'use strict';

  // ── Mobile detection ──────────────────────────────────────
  function detectDevice() {
    var w = window.innerWidth;
    document.documentElement.setAttribute('data-device', w <= 600 ? 'mobile' : w <= 900 ? 'tablet' : 'desktop');
  }
  detectDevice();
  window.addEventListener('resize', detectDevice);

  // ── Load a Google Font dynamically ────────────────────────
  var loadedFonts = {};
  function loadGoogleFont(googleName) {
    if (!googleName || loadedFonts[googleName]) return;
    loadedFonts[googleName] = true;
    var link  = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + googleName + '&display=swap';
    document.head.appendChild(link);
  }

  // ── Apply theme CSS variables ──────────────────────────────
  function applyTheme(config) {
    var root = document.documentElement;
    var t    = config.theme;
    var s    = config.slideshow;
    root.style.setProperty('--accent',        t.accentColor);
    root.style.setProperty('--accent-dim',    t.accentDim);
    root.style.setProperty('--accent-glow',   t.accentGlow || 'rgba(232,232,232,0.08)');
    root.style.setProperty('--hint-color',    t.hintColor  || '#555555');
    root.style.setProperty('--bg-overlay',    s ? s.overlay : 'rgba(0,0,0,0.55)');
    root.style.setProperty('--drawer-bg',     t.drawerBackground);
    root.style.setProperty('--drawer-border', t.drawerBorder);
    root.style.setProperty('--font-display',  t.fontDisplay);
    root.style.setProperty('--font-body',     t.fontBody);
    if (s) root.style.setProperty('--slide-fade', (s.fadeDuration / 1000) + 's');
    if (t.fontSizes) {
      var fs = t.fontSizes;
      if (fs.eyebrow)    root.style.setProperty('--size-eyebrow',    fs.eyebrow);
      if (fs.title)      root.style.setProperty('--size-title',      fs.title);
      if (fs.subtitle)   root.style.setProperty('--size-subtitle',   fs.subtitle);
      if (fs.tagline)    root.style.setProperty('--size-tagline',    fs.tagline);
      if (fs.navItem)    root.style.setProperty('--size-nav-item',   fs.navItem);
      if (fs.navFooter)  root.style.setProperty('--size-nav-footer', fs.navFooter);
      if (fs.cardSport)  root.style.setProperty('--size-card-sport', fs.cardSport);
      if (fs.cardName)   root.style.setProperty('--size-card-name',  fs.cardName);
      if (fs.cardCta)    root.style.setProperty('--size-card-cta',   fs.cardCta);
      if (fs.champTitle)  root.style.setProperty('--size-champ-title',  fs.champTitle);
      if (fs.champTeam)   root.style.setProperty('--size-champ-team',   fs.champTeam);
      if (fs.champOwner)  root.style.setProperty('--size-champ-owner',  fs.champOwner);
      if (fs.champScore)  root.style.setProperty('--size-champ-score',  fs.champScore);
      if (fs.adminLabel) root.style.setProperty('--size-admin-label',fs.adminLabel);
      if (fs.adminHint)  root.style.setProperty('--size-admin-hint', fs.adminHint);
      if (fs.sectionHeading) root.style.setProperty('--size-section-heading', fs.sectionHeading);
    }
    if (t.fontBold) {
      var fb = t.fontBold;
      var boldVarMap = {
        eyebrow: '--weight-eyebrow', title: '--weight-title', subtitle: '--weight-subtitle',
        tagline: '--weight-tagline', navItem: '--weight-nav-item', navFooter: '--weight-nav-footer',
        cardSport: '--weight-card-sport', cardName: '--weight-card-name', cardCta: '--weight-card-cta',
        adminLabel: '--weight-admin-label', adminHint: '--weight-admin-hint', sectionHeading: '--weight-section-heading',
        champTitle: '--weight-champ-title', champTeam: '--weight-champ-team',
        champOwner: '--weight-champ-owner', champScore: '--weight-champ-score'
      };
      Object.keys(boldVarMap).forEach(function (key) {
        root.style.setProperty(boldVarMap[key], fb[key] ? '700' : '');
      });
    }

    // Pre-load active fonts
    if (window.FONT_OPTIONS) {
      var allFonts = window.FONT_OPTIONS.display.concat(window.FONT_OPTIONS.body);
      allFonts.forEach(function (f) {
        var name = f.value.replace(/'/g, '').split(',')[0].trim();
        if (t.fontDisplay.indexOf(name) !== -1 || t.fontBody.indexOf(name) !== -1) {
          loadGoogleFont(f.google);
        }
      });
    }
  }

  // ── Build nav from config ──────────────────────────────────
  function buildNav(config) {
    var navEl = document.querySelector('.drawer-nav');
    if (!navEl) return;
    navEl.innerHTML = '';
    config.menu.forEach(function (item) {
      var li = document.createElement('li');
      var a  = document.createElement('a');
      a.href        = item.href;
      a.textContent = item.label;
      if (item.external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      li.appendChild(a);
      navEl.appendChild(li);
    });
  }

  // ── Populate landing text ──────────────────────────────────
  function buildLanding(config) {
    var L = config.landing;
    var bgEl = document.querySelector('.landing-overlay');
    if (bgEl && config.slideshow && document.querySelector('.landing-page')) bgEl.style.background = config.slideshow.overlay;

    function setText(sel, val) {
      var el = document.querySelector(sel);
      if (el && val !== undefined) el.textContent = val;
    }
    setText('#landing-eyebrow',  L.eyebrow);
    setText('.landing-title',    L.title);
    setText('.landing-subtitle', L.subtitle);
    setText('.landing-tagline',  L.tagline);
    setText('.topnav-logo',      L.logoMark || L.title);

    // League cards
    var cardsEl = document.querySelector('.league-cards');
    if (cardsEl && config.leagueData) {
      cardsEl.innerHTML = '';
      config.leagueData.forEach(function (league) {
        var card       = document.createElement('a');
        card.href      = league.link || '#';
        card.className = 'league-card';
        card.innerHTML =
          '<div class="league-card-sport">' + league.sport + ' \u00b7 ' + league.season + '</div>' +
          '<div class="league-card-name">'  + league.name  + '</div>' +
          '<div class="league-card-cta">'   + league.linkLabel + ' \u2197</div>';
        cardsEl.appendChild(card);
      });
    }

    // Footer
    var footerEl = document.querySelector('.site-footer');
    if (footerEl) {
      if (config.footer && config.footer.show) footerEl.textContent = config.footer.text;
      else footerEl.style.display = 'none';
    }

    var drawerFooterEl = document.querySelector('.drawer-footer');
    if (drawerFooterEl) {
      drawerFooterEl.textContent = config.drawerFooter || '';
    }

    if (L.title) document.title = L.title + ' \u2014 Fantasy Commission';
  }

  // ══════════════════════════════════════════════════════════
  //  SLIDESHOW ENGINE
  // ══════════════════════════════════════════════════════════
  function initSlideshow(config) {
    var ss = config.slideshow;
    if (!ss || !ss.slides || ss.slides.length === 0) return;

    var slideA      = document.getElementById('slideA');
    var slideB      = document.getElementById('slideB');
    if (!slideA || !slideB) return;

    var slides      = ss.slides;
    var total       = slides.length;
    var displayMs   = ss.displayDuration || 8000;
    var fadeMs      = ss.fadeDuration    || 2000;
    var cycleMs     = displayMs + fadeMs;
    var currentIdx  = 0;
    var activLayer  = slideA;   // currently visible layer
    var inactLayer  = slideB;   // next layer being prepared

    // Preload all images
    slides.forEach(function (s) {
      var img = new Image();
      img.src = s.image;
    });

    function applySlide(layer, slide) {
      layer.style.backgroundImage   = 'url("' + slide.image + '")';
      layer.style.animationName     = slide.direction || 'kb-zoom-in';
      layer.style.animationDuration = cycleMs + 'ms';
      layer.style.animationDelay    = '0ms';
      layer.style.animationPlayState = 'paused';
      layer.classList.add('kb-active');
    }

    function resetLayer(layer) {
      layer.classList.remove('kb-active');
      layer.style.animation = 'none';
      void layer.offsetWidth;
      layer.style.animation = '';
    }

    function showSlide(idx) {
      var slide = slides[idx];
      applySlide(inactLayer, slide);
      // Incoming layer must be on top of outgoing layer regardless of DOM order
      activLayer.style.zIndex  = '1';
      inactLayer.style.zIndex  = '2';
      inactLayer.style.animationPlayState = 'running';
      inactLayer.classList.add('is-active');
      setTimeout(function () {
        activLayer.classList.remove('is-active');
        var outgoing = activLayer;
        activLayer   = inactLayer;
        inactLayer   = outgoing;
        setTimeout(function () { resetLayer(inactLayer); }, 50);
      }, fadeMs);
    }

    // First slide
    applySlide(slideA, slides[0]);
    slideA.style.zIndex = '2';
    slideB.style.zIndex = '1';
    slideA.style.animationPlayState = 'running';
    slideA.classList.add('is-active');
    activLayer = slideA;
    resetLayer(slideB);
    inactLayer = slideB;

    if (total === 1) return;

    function cycle() {
      currentIdx = (currentIdx + 1) % total;
      showSlide(currentIdx);
      // Schedule next cycle from the moment this one starts — no drift
      setTimeout(cycle, cycleMs);
    }

    setTimeout(cycle, cycleMs);
  }

  // ── Drawer logic ──────────────────────────────────────────
  function initDrawer() {
    var trigger = document.querySelector('.menu-trigger');
    var drawer  = document.querySelector('.drawer');
    var overlay = document.querySelector('.drawer-overlay');
    if (!trigger || !drawer || !overlay) return;

    var isOpen = false;

    function open() {
      isOpen = true;
      drawer.classList.add('is-open');
      overlay.classList.add('is-visible');
      trigger.classList.add('is-active');
      document.body.classList.add('no-scroll');
      trigger.setAttribute('aria-expanded', 'true');
      var links = drawer.querySelectorAll('.drawer-nav a');
      links.forEach(function (a, i) {
        a.style.transitionDelay = (0.05 + i * 0.04) + 's';
        a.style.opacity   = '1';
        a.style.transform = 'translateX(0)';
      });
    }

    function close() {
      isOpen = false;
      drawer.classList.remove('is-open');
      overlay.classList.remove('is-visible');
      trigger.classList.remove('is-active');
      document.body.classList.remove('no-scroll');
      trigger.setAttribute('aria-expanded', 'false');
      drawer.querySelectorAll('.drawer-nav a').forEach(function (a) {
        a.style.transitionDelay = '0s';
      });
    }

    var links = drawer.querySelectorAll('.drawer-nav a');
    links.forEach(function (a) {
      a.style.opacity   = '0';
      a.style.transform = 'translateX(20px)';
      a.style.transition = 'opacity 0.35s ease, transform 0.35s ease, color 0.4s ease, padding-left 0.4s ease, border-color 0.4s ease';
    });

    trigger.addEventListener('click', function () { isOpen ? close() : open(); });
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });
    drawer.querySelectorAll('.drawer-nav a').forEach(function (a) {
      a.addEventListener('click', function () { if (!a.target || a.target !== '_blank') close(); });
    });
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    var config = window.SITE_CONFIG;
    if (!config) { console.warn('SITE_CONFIG not found.'); return; }
    applyTheme(config);
    buildNav(config);
    buildLanding(config);
    initSlideshow(config);
    initDrawer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

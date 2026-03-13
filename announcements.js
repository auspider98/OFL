/**
 * ============================================================
 *  ANNOUNCEMENTS.JS — PUBLIC RENDERER
 *
 *  Reads ofc_announcements from localStorage, filters by
 *  active flag and date window, and renders the first live
 *  announcement onto index.html.
 *
 *  Styles live in style.css (search: ANNOUNCEMENTS).
 *  Admin lives in announcements-admin.html.
 * ============================================================
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'ofc_announcements';
  var SESSION_KEY = 'ofc_ann_dismissed_session'; // comma-separated dismissed ids
  var PERM_KEY    = 'ofc_ann_dismissed_perm';    // comma-separated dismissed ids

  /* ── Load announcements ───────────────────────────────── */
  function loadAnnouncements() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  /* ── Check dismiss state ──────────────────────────────── */
  function isDismissed(ann) {
    if (ann.dismissBehavior === 'session') {
      var sess = (sessionStorage.getItem(SESSION_KEY) || '').split(',');
      return sess.indexOf(ann.id) !== -1;
    }
    if (ann.dismissBehavior === 'permanent') {
      var perm = (localStorage.getItem(PERM_KEY) || '').split(',');
      return perm.indexOf(ann.id) !== -1;
    }
    return false; // 'always' — never suppressed
  }

  /* ── Mark dismissed ───────────────────────────────────── */
  function markDismissed(ann) {
    if (ann.dismissBehavior === 'session') {
      var sess = (sessionStorage.getItem(SESSION_KEY) || '').split(',').filter(Boolean);
      if (sess.indexOf(ann.id) === -1) sess.push(ann.id);
      sessionStorage.setItem(SESSION_KEY, sess.join(','));
    }
    if (ann.dismissBehavior === 'permanent') {
      var perm = (localStorage.getItem(PERM_KEY) || '').split(',').filter(Boolean);
      if (perm.indexOf(ann.id) === -1) perm.push(ann.id);
      localStorage.setItem(PERM_KEY, perm.join(','));
    }
  }

  /* ── Pick the active announcement ────────────────────── */
  function getActiveAnnouncement() {
    var list = loadAnnouncements();
    var now  = Date.now();
    for (var i = 0; i < list.length; i++) {
      var ann = list[i];
      if (!ann.active) continue;
      if (ann.startDate && now < new Date(ann.startDate).getTime()) continue;
      if (ann.endDate   && now > new Date(ann.endDate).getTime())   continue;
      if (isDismissed(ann)) continue;
      return ann;
    }
    return null;
  }

  /* ══════════════════════════════════════════════════════
     RENDERERS
  ══════════════════════════════════════════════════════ */

  /* ── Shared: build dismiss button ────────────────────── */
  // backdrop is optional — Dispatch passes it so the blur
  // clears immediately when X is clicked.
  function buildDismissBtn(ann, container, backdrop) {
    var btn = document.createElement('button');
    btn.className = 'ann-dismiss';
    btn.innerHTML = '&#x2715;';
    btn.setAttribute('aria-label', 'Dismiss announcement');
    btn.addEventListener('click', function () {
      markDismissed(ann);
      // Remove backdrop before dismissing panel (fixes blur-stuck bug)
      if (backdrop) {
        backdrop.classList.remove('ann-visible');
        setTimeout(function () {
          if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        }, 500);
      }
      dismiss(container, ann.style);
    });
    return btn;
  }

  /* ── Dismiss animation ────────────────────────────────── */
  function dismiss(el, style) {
    el.classList.add('ann-dismissing');
    var dur = style === 'ribbon' ? 400 : 500;
    setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (style === 'ribbon') recoverRibbonSpace();
    }, dur);
  }

  /* ── Recover space after ribbon push-mode dismiss ─────── */
  function recoverRibbonSpace() {
    document.body.style.transition = 'padding-top 0.4s ease';
    document.body.style.paddingTop = '';
    setTimeout(function () { document.body.style.transition = ''; }, 450);
  }

  /* ── Apply idle animation class ──────────────────────── */
  function applyIdle(el, idle) {
    if (!idle || idle === 'none') return;
    el.classList.add('ann-idle-' + idle);
  }

  /* ── Insert element below hero, above league cards ───────── */
  // Targets .league-cards and inserts before it — landing the
  // element in the gap between the tagline and the entry cards.
  function insertBelowHero(el) {
    var cards = document.querySelector('.league-cards');
    if (cards && cards.parentNode) {
      cards.parentNode.insertBefore(el, cards);
    } else {
      document.body.appendChild(el);
    }
  }

  /* ──────────────────────────────────────────────────────
     DISPATCH (modal popup)
  ────────────────────────────────────────────────────── */
  function renderDispatch(ann) {
    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.className = 'ann-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    // Panel
    var panel = document.createElement('div');
    panel.className = 'ann-dispatch';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', ann.title || 'Commissioner Announcement');
    panel.classList.add('ann-entry-' + (ann.entryAnimation || 'fade-up'));

    // Watermark — sits behind all content
    if (ann.watermarkUrl) {
      var watermark = document.createElement('div');
      watermark.className = 'ann-watermark';
      watermark.style.backgroundImage = 'url(' + ann.watermarkUrl + ')';
      watermark.style.opacity = ann.watermarkOpacity != null ? ann.watermarkOpacity : 0.07;
      panel.appendChild(watermark);
    }

    // Letterhead — centered image above eyebrow
    if (ann.letterheadUrl) {
      var lh = document.createElement('img');
      lh.className = 'ann-letterhead';
      lh.src = ann.letterheadUrl;
      lh.alt = '';
      lh.setAttribute('aria-hidden', 'true');
      if (ann.letterheadHeight) lh.style.height = parseInt(ann.letterheadHeight, 10) + 'px';
      panel.appendChild(lh);
    }

    // Eyebrow — configurable, centered
    var eyebrow = document.createElement('p');
    eyebrow.className   = 'ann-eyebrow ann-eyebrow-dispatch';
    eyebrow.textContent = (ann.eyebrow && ann.eyebrow.trim()) ? ann.eyebrow.trim() : 'Commissioner\'s Office';

    // Title
    var title = document.createElement('h2');
    title.className   = 'ann-title';
    title.textContent = ann.title || '';

    // Divider
    var divider = document.createElement('div');
    divider.className = 'ann-divider';

    // Body
    var body = document.createElement('p');
    body.className   = 'ann-body';
    body.textContent = ann.body || '';

    panel.appendChild(eyebrow);
    panel.appendChild(title);
    panel.appendChild(divider);
    panel.appendChild(body);

    // Optional dismiss button — passes backdrop so blur clears on X click
    if (ann.showDismiss !== false) {
      panel.appendChild(buildDismissBtn(ann, panel, backdrop));
    }

    applyIdle(panel, ann.idleAnimation);

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    // Shared close — used by backdrop click and auto-dismiss
    function closeDispatch() {
      markDismissed(ann);
      backdrop.classList.remove('ann-visible');
      dismiss(panel, 'dispatch');
      setTimeout(function () {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      }, 500);
    }

    // Animate in
    setTimeout(function () {
      backdrop.classList.add('ann-visible');
      panel.classList.add('ann-visible');
    }, 80);

    // Close on backdrop click
    backdrop.addEventListener('click', closeDispatch);

    // Auto-dismiss
    if (ann.autoDismiss && ann.autoDismissSecs > 0) {
      var remaining = ann.autoDismissSecs;
      var timerEl   = document.createElement('p');
      timerEl.className   = 'ann-timer';
      timerEl.textContent = 'Closing in ' + remaining + 's';
      panel.appendChild(timerEl);

      var countdown = setInterval(function () {
        remaining--;
        if (remaining <= 0) {
          clearInterval(countdown);
          closeDispatch();
        } else {
          timerEl.textContent = 'Closing in ' + remaining + 's';
        }
      }, 1000);

      // Cancel countdown if manually dismissed via X
      if (ann.showDismiss !== false) {
        var xBtn = panel.querySelector('.ann-dismiss');
        if (xBtn) xBtn.addEventListener('click', function () { clearInterval(countdown); });
      }
    }
  }

  /* ──────────────────────────────────────────────────────
     RIBBON (top / bottom / below-hero banner)
  ────────────────────────────────────────────────────── */
  function renderRibbon(ann) {
    var position = ann.position || 'top'; // 'top' | 'bottom' | 'below-hero'

    var ribbon = document.createElement('div');
    ribbon.className = 'ann-ribbon';
    ribbon.classList.add('ann-entry-' + (ann.entryAnimation || 'slide-down'));

    if (position === 'bottom') {
      ribbon.classList.add('ann-ribbon-bottom');
    } else if (position === 'below-hero') {
      ribbon.classList.add('ann-ribbon-below-hero');
    } else {
      // top — fixed; optionally push body down
      ribbon.classList.add(ann.ribbonLayout === 'push' ? 'ann-ribbon-push' : 'ann-ribbon-float');
    }

    var inner = document.createElement('div');
    inner.className = 'ann-ribbon-inner';

    var titleEl = document.createElement('span');
    titleEl.className   = 'ann-ribbon-title';
    titleEl.textContent = ann.title || '';

    var sep = document.createElement('span');
    sep.className   = 'ann-ribbon-sep';
    sep.textContent = ann.title && ann.body ? ' · ' : '';

    var bodyEl = document.createElement('span');
    bodyEl.className   = 'ann-ribbon-body';
    bodyEl.textContent = ann.body || '';

    inner.appendChild(titleEl);
    inner.appendChild(sep);
    inner.appendChild(bodyEl);
    ribbon.appendChild(inner);

    if (ann.showDismiss !== false) {
      ribbon.appendChild(buildDismissBtn(ann, ribbon));
    }

    applyIdle(ribbon, ann.idleAnimation);

    if (position === 'below-hero') {
      insertBelowHero(ribbon);
    } else {
      document.body.appendChild(ribbon);
    }

    setTimeout(function () {
      ribbon.classList.add('ann-visible');
      if (position === 'top' && ann.ribbonLayout === 'push') {
        var h = ribbon.offsetHeight;
        document.body.style.transition = 'padding-top 0.4s ease';
        document.body.style.paddingTop = h + 'px';
      }
    }, 80);

    if (ann.autoDismiss && ann.autoDismissSecs > 0) {
      setTimeout(function () {
        markDismissed(ann);
        dismiss(ribbon, 'ribbon');
      }, ann.autoDismissSecs * 1000);
    }
  }

  /* ──────────────────────────────────────────────────────
     MARQUEE (top / bottom / below-hero ticker)
  ────────────────────────────────────────────────────── */
  function renderMarquee(ann) {
    var position = ann.position || 'bottom'; // 'top' | 'bottom' | 'below-hero'

    var bar = document.createElement('div');
    bar.className = 'ann-marquee';
    bar.classList.add('ann-entry-' + (ann.entryAnimation || 'slide-up'));

    if (position === 'top') {
      bar.classList.add('ann-marquee-top');
    } else if (position === 'below-hero') {
      bar.classList.add('ann-marquee-below-hero');
    }
    // 'bottom' is default — no extra class needed

    // Label: configurable text, optional visibility
    if (ann.showMarqueeLabel !== false) {
      var labelText = (ann.marqueeLabel && ann.marqueeLabel.trim()) ? ann.marqueeLabel.trim() : 'COMMISSIONER';
      var label = document.createElement('span');
      label.className   = 'ann-marquee-label';
      label.textContent = labelText;
      bar.appendChild(label);
    }

    // Track + scrolling inner
    var track = document.createElement('div');
    track.className = 'ann-marquee-track';

    var text   = (ann.title ? ann.title + (ann.body ? ' · ' + ann.body : '') : ann.body) || '';
    var padded = text + '  ·  ' + text + '  ·  ';

    var inner = document.createElement('div');
    inner.className   = 'ann-marquee-inner';
    inner.textContent = padded;

    track.appendChild(inner);
    bar.appendChild(track);

    if (ann.showDismiss !== false) {
      bar.appendChild(buildDismissBtn(ann, bar));
    }

    applyIdle(bar, ann.idleAnimation);

    if (position === 'below-hero') {
      insertBelowHero(bar);
    } else {
      document.body.appendChild(bar);
    }

    setTimeout(function () { bar.classList.add('ann-visible'); }, 80);

    if (ann.autoDismiss && ann.autoDismissSecs > 0) {
      setTimeout(function () {
        markDismissed(ann);
        dismiss(bar, 'marquee');
      }, ann.autoDismissSecs * 1000);
    }
  }

  /* ══════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════ */
  function boot() {
    var ann = getActiveAnnouncement();
    if (!ann) return;

    // Delay so hero animations complete first (~1.4s)
    setTimeout(function () {
      if      (ann.style === 'dispatch') renderDispatch(ann);
      else if (ann.style === 'ribbon')   renderRibbon(ann);
      else if (ann.style === 'marquee')  renderMarquee(ann);
    }, 1400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();

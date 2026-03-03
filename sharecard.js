/**
 * ============================================================
 *  SHARECARD.JS — OFL Canvas Share Card Generator
 *
 *  Exposes: window.OFL.shareCard.open(data)
 *
 *  data = {
 *    name, nickname, mugshot,
 *    stats:       [ { label, value } ],
 *    rank,           optional — shown as "# N" badge
 *    leagueLabel     e.g. "OFC · Overall" or "2024 OFC Champion · OFL"
 *  }
 *
 *  Sizes: square 1080×1080 | landscape 1200×630 | portrait 1080×1350
 *  Background: mugshot blurred full-bleed + dark scrim + noise
 *  Accent colours read from CSS variables at draw time.
 * ============================================================
 */
(function () {
  'use strict';

  window.OFL = window.OFL || {};

  // ── Size presets ─────────────────────────────────────────
  var SIZES = {
    square:    { w: 1080, h: 1080, label: 'Square  1080\u00d71080' },
    landscape: { w: 1200, h: 630,  label: 'Landscape  1200\u00d7630' },
    portrait:  { w: 1080, h: 1350, label: 'Portrait  1080\u00d71350' }
  };

  // ── Read a CSS variable ──────────────────────────────────
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  // ── Load image → Promise<HTMLImageElement|null> ──────────
  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) { resolve(null); return; }
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  // ── Blurred full-bleed background ────────────────────────
  function drawBackground(ctx, img, W, H) {
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, W, H);

    if (img) {
      var scale = Math.max(W / img.width, H / img.height) * 1.18;
      var sw = img.width * scale, sh = img.height * scale;
      var sx = (W - sw) / 2,     sy = (H - sh) / 2;

      // Downscale → upscale for blur
      var bW = Math.ceil(W / 8), bH = Math.ceil(H / 8);
      var o1 = document.createElement('canvas');
      o1.width = bW; o1.height = bH;
      o1.getContext('2d').drawImage(img, sx / 8, sy / 8, sw / 8, sh / 8);

      var o2 = document.createElement('canvas');
      o2.width = W; o2.height = H;
      var c2 = o2.getContext('2d');
      c2.imageSmoothingEnabled = true;
      c2.imageSmoothingQuality = 'high';
      c2.drawImage(o1, 0, 0, W, H);
      ctx.drawImage(o2, 0, 0);
    }

    var scrim = ctx.createLinearGradient(0, 0, 0, H);
    scrim.addColorStop(0,   'rgba(0,0,0,0.60)');
    scrim.addColorStop(0.5, 'rgba(0,0,0,0.48)');
    scrim.addColorStop(1,   'rgba(0,0,0,0.80)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Noise texture ────────────────────────────────────────
  function drawNoise(ctx, W, H) {
    var gs = 160;
    var off = document.createElement('canvas');
    off.width = off.height = gs;
    var gc = off.getContext('2d');
    var id = gc.createImageData(gs, gs);
    for (var i = 0; i < id.data.length; i += 4) {
      var v = Math.random() * 255 | 0;
      id.data[i] = id.data[i+1] = id.data[i+2] = v;
      id.data[i+3] = 10;
    }
    gc.putImageData(id, 0, 0);
    ctx.fillStyle = ctx.createPattern(off, 'repeat');
    ctx.fillRect(0, 0, W, H);
  }

  // ── Gold accent bar ──────────────────────────────────────
  function drawAccentBar(ctx, W, H, gold) {
    ctx.fillStyle = gold;
    ctx.fillRect(0, 0, Math.round(W * 0.0065), H);
  }

  // ── Circular mugshot ─────────────────────────────────────
  function drawCircleMugshot(ctx, img, cx, cy, r, gold) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + Math.round(r * 0.045), 0, Math.PI * 2);
    ctx.strokeStyle = gold;
    ctx.lineWidth   = Math.round(r * 0.045);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    if (img) {
      var s = Math.max((r * 2) / img.width, (r * 2) / img.height);
      ctx.drawImage(img,
        cx - img.width  * s / 2, cy - img.height * s / 2,
        img.width * s, img.height * s);
    } else {
      ctx.fillStyle = 'rgba(232,232,232,0.06)';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // ── Text wrap ────────────────────────────────────────────
  function wrapText(ctx, text, maxW) {
    var words = text.split(' '), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  // ── Render one card ──────────────────────────────────────
  function renderCard(canvas, data, sizeKey) {
    return new Promise(function (resolve) {
      var size = SIZES[sizeKey] || SIZES.square;
      var W = size.w, H = size.h;
      canvas.width  = W;
      canvas.height = H;
      var ctx = canvas.getContext('2d');

      var gold  = cssVar('--hint-color',  '#b8972a');
      var acc   = cssVar('--accent',      '#e8e8e8');
      var dim   = cssVar('--accent-dim',  '#888888');
      var DF    = 'Georgia, "Times New Roman", serif';
      var BF    = '"Helvetica Neue", Helvetica, Arial, sans-serif';

      loadImage(data.mugshot).then(function (img) {
        drawBackground(ctx, img, W, H);
        drawNoise(ctx, W, H);
        drawAccentBar(ctx, W, H, gold);

        var pad = Math.round(W * 0.072);

        /* ── LANDSCAPE ─────────────────────────────────── */
        if (sizeKey === 'landscape') {
          var mR  = Math.round(H * 0.30);
          var mCX = pad + mR + Math.round(W * 0.008);
          var mCY = Math.round(H * 0.50);
          drawCircleMugshot(ctx, img, mCX, mCY, mR, gold);

          var tX  = mCX + mR + Math.round(W * 0.05);
          var tW  = W - tX - pad;
          var cur = Math.round(H * 0.20);

          // Name
          var nPx = Math.round(H * 0.118);
          ctx.font = '300 ' + nPx + 'px ' + DF;
          ctx.fillStyle = acc; ctx.textAlign = 'left';
          var nl = wrapText(ctx, data.name.toUpperCase(), tW);
          nl.forEach(function (l, i) { ctx.fillText(l, tX, cur + i * nPx * 1.06); });
          cur += nl.length * nPx * 1.06;

          if (data.nickname) {
            var nkPx = Math.round(H * 0.056);
            ctx.font = 'italic 300 ' + nkPx + 'px ' + BF;
            ctx.fillStyle = dim;
            ctx.fillText('\u201c' + data.nickname + '\u201d', tX, cur + nkPx * 0.35);
            cur += nkPx * 1.15;
          }

          var sValPx = Math.round(H * 0.125), sLblPx = Math.round(H * 0.046);
          var sY = cur + Math.round(H * 0.075);
          var slot = Math.round(tW / Math.max(data.stats.length, 1));
          data.stats.forEach(function (s, i) {
            var sx = tX + i * slot;
            ctx.font = '300 ' + sValPx + 'px ' + DF; ctx.fillStyle = acc; ctx.textAlign = 'left';
            ctx.fillText(s.value, sx, sY);
            ctx.font = '500 ' + sLblPx + 'px ' + BF; ctx.fillStyle = dim;
            ctx.fillText(s.label.toUpperCase(), sx, sY + sValPx * 0.25 + sLblPx);
          });

        /* ── SQUARE / PORTRAIT ──────────────────────────── */
        } else {
          var isPort = sizeKey === 'portrait';
          var mR2 = Math.round(Math.min(W, H) * (isPort ? 0.17 : 0.195));
          var mCX2 = Math.round(W / 2);
          var mCY2 = Math.round(H * (isPort ? 0.27 : 0.285));
          drawCircleMugshot(ctx, img, mCX2, mCY2, mR2, gold);

          var cur2 = mCY2 + mR2 + Math.round(H * 0.045);

          // Rank
          if (data.rank) {
            var rkPx = Math.round(H * 0.038);
            ctx.font = '600 ' + rkPx + 'px ' + BF;
            ctx.fillStyle = gold; ctx.textAlign = 'center';
            ctx.fillText('# ' + data.rank, mCX2, cur2);
            cur2 += Math.round(rkPx * 1.65);
          }

          // Name
          var nPx2 = Math.round(H * (isPort ? 0.072 : 0.082));
          ctx.font = '300 ' + nPx2 + 'px ' + DF;
          ctx.fillStyle = acc; ctx.textAlign = 'center';
          var nl2 = wrapText(ctx, data.name.toUpperCase(), W - pad * 2);
          nl2.forEach(function (l, i) { ctx.fillText(l, mCX2, cur2 + i * nPx2 * 1.06); });
          cur2 += nl2.length * nPx2 * 1.06;

          // Nickname
          if (data.nickname) {
            var nkPx2 = Math.round(H * 0.037);
            ctx.font = 'italic 300 ' + nkPx2 + 'px ' + BF;
            ctx.fillStyle = dim; ctx.textAlign = 'center';
            ctx.fillText('\u201c' + data.nickname + '\u201d', mCX2, cur2 + nkPx2 * 0.55);
            cur2 += Math.round(nkPx2 * 1.35);
          }

          // Divider
          cur2 += Math.round(H * (isPort ? 0.045 : 0.036));
          var dW = Math.round(W * 0.32);
          ctx.save();
          ctx.strokeStyle = gold; ctx.lineWidth = 1; ctx.globalAlpha = 0.38;
          ctx.beginPath(); ctx.moveTo(mCX2 - dW/2, cur2); ctx.lineTo(mCX2 + dW/2, cur2); ctx.stroke();
          ctx.restore();
          cur2 += Math.round(H * (isPort ? 0.072 : 0.058));

          // Stats
          var sValPx2 = Math.round(H * (isPort ? 0.078 : 0.088));
          var sLblPx2 = Math.round(H * 0.033);
          var cnt     = data.stats.length || 1;
          var slotW   = (W - pad * 2) / cnt;

          data.stats.forEach(function (s, i) {
            var scx = pad + i * slotW + slotW / 2;
            if (i > 0) {
              ctx.save();
              ctx.strokeStyle = 'rgba(232,232,232,0.12)'; ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(pad + i * slotW, cur2 - sValPx2 * 0.55);
              ctx.lineTo(pad + i * slotW, cur2 + sLblPx2 * 1.3);
              ctx.stroke(); ctx.restore();
            }
            ctx.font = '300 ' + sValPx2 + 'px ' + DF; ctx.fillStyle = acc; ctx.textAlign = 'center';
            ctx.fillText(s.value, scx, cur2);
            ctx.font = '500 ' + sLblPx2 + 'px ' + BF; ctx.fillStyle = dim;
            ctx.fillText(s.label.toUpperCase(), scx, cur2 + sValPx2 * 0.22 + sLblPx2);
          });
        }

        // ── Watermark
        var wmPx = Math.round(H * 0.032);
        ctx.font = '400 ' + wmPx + 'px ' + BF;
        ctx.fillStyle = 'rgba(232,232,232,0.26)'; ctx.textAlign = 'center';
        ctx.fillText((data.leagueLabel || 'OFL').toUpperCase(), W / 2, H - Math.round(H * 0.038));

        resolve();
      });
    });
  }

  // ── Download ─────────────────────────────────────────────
  function downloadCanvas(canvas, filename) {
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = filename || 'ofl-sharecard.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }, 'image/png');
  }

  // ── Copy to clipboard ────────────────────────────────────
  function copyCanvas(canvas, onDone, onFail) {
    canvas.toBlob(function (blob) {
      if (!navigator.clipboard || !window.ClipboardItem) { onFail(); return; }
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(onDone).catch(onFail);
    }, 'image/png');
  }

  // ── UI panel ─────────────────────────────────────────────
  function open(data) {
    var existing = document.getElementById('oflShareCardOverlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'oflShareCardOverlay';
    overlay.className = 'ofl-sc-overlay';

    var panel = document.createElement('div');
    panel.className = 'ofl-sc-panel';

    // Header
    var header = document.createElement('div');
    header.className = 'ofl-sc-header';
    header.innerHTML =
      '<span class="ofl-sc-title">Share Card</span>' +
      '<button class="ofl-sc-close" aria-label="Close">&times;</button>';
    panel.appendChild(header);

    // Size buttons
    var currentSize = 'square';
    var sizeRow = document.createElement('div');
    sizeRow.className = 'ofl-sc-size-row';
    Object.keys(SIZES).forEach(function (key) {
      var btn = document.createElement('button');
      btn.className = 'ofl-sc-size-btn' + (key === currentSize ? ' is-active' : '');
      btn.textContent = SIZES[key].label;
      btn.setAttribute('data-size', key);
      btn.addEventListener('click', function () {
        currentSize = key;
        sizeRow.querySelectorAll('.ofl-sc-size-btn').forEach(function (b) {
          b.classList.toggle('is-active', b.getAttribute('data-size') === key);
        });
        renderCard(canvas, data, currentSize).then(updateScale);
      });
      sizeRow.appendChild(btn);
    });
    panel.appendChild(sizeRow);

    // Canvas preview
    var previewWrap = document.createElement('div');
    previewWrap.className = 'ofl-sc-preview-wrap';
    var canvas = document.createElement('canvas');
    canvas.className = 'ofl-sc-canvas';
    previewWrap.appendChild(canvas);
    panel.appendChild(previewWrap);

    function updateScale() {
      var s = SIZES[currentSize];
      var maxW = Math.min(360, (panel.clientWidth || 380) - 40);
      canvas.style.width  = Math.round(s.w * (maxW / s.w)) + 'px';
      canvas.style.height = Math.round(s.h * (maxW / s.w)) + 'px';
    }

    // Actions
    var actions = document.createElement('div');
    actions.className = 'ofl-sc-actions';

    var dlBtn = document.createElement('button');
    dlBtn.className = 'ofl-sc-btn ofl-sc-btn-primary';
    dlBtn.textContent = 'Download PNG';
    dlBtn.addEventListener('click', function () {
      var slug = (data.name || 'player').toLowerCase().replace(/\s+/g, '-');
      downloadCanvas(canvas, 'ofl-' + slug + '-' + currentSize + '.png');
    });

    var cpBtn = document.createElement('button');
    cpBtn.className = 'ofl-sc-btn';
    cpBtn.textContent = 'Copy to Clipboard';
    cpBtn.addEventListener('click', function () {
      cpBtn.textContent = 'Copying\u2026';
      copyCanvas(canvas,
        function () { cpBtn.textContent = '\u2713 Copied!'; setTimeout(function () { cpBtn.textContent = 'Copy to Clipboard'; }, 2200); },
        function () { cpBtn.textContent = 'Not supported'; setTimeout(function () { cpBtn.textContent = 'Copy to Clipboard'; }, 2200); }
      );
    });

    actions.appendChild(dlBtn);
    actions.appendChild(cpBtn);
    panel.appendChild(actions);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Close
    header.querySelector('.ofl-sc-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    function onEsc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); } }
    document.addEventListener('keydown', onEsc);

    // Initial render
    renderCard(canvas, data, currentSize).then(updateScale);
  }

  window.OFL.shareCard = { open: open };

})();

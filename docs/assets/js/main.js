/*!
 * FreeNode · 前端交互层 v2
 * - prefers-reduced-motion 双重降级 (CSS + JS)
 * - 纯 JS 二维码生成 (调用 qr.js,无第三方 API)
 * - 站内搜索 (fuzzy search,~2KB)
 * - CountUp / Tilt 仅在非 reduced-motion 时启用
 */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE = window.matchMedia('(max-width: 768px)').matches;

  // ============================================================
  // Toast 通知
  // ============================================================
  function showToast(message, type) {
    var stack = document.getElementById('toast-stack');
    if (!stack) return;
    var t = document.createElement('div');
    t.className = 'toast';
    if (type === 'error') {
      t.style.borderColor = 'rgba(248, 81, 73, 0.4)';
      t.style.color = '#f85149';
    } else if (type === 'warn') {
      t.style.borderColor = 'rgba(210, 153, 34, 0.4)';
      t.style.color = '#d29922';
    }
    var icon = type === 'error' ? '✕' : (type === 'warn' ? '⚠' : '✓');
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + escapeHtml(message) + '</span>';
    stack.appendChild(t);
    setTimeout(function () {
      t.classList.add('is-leaving');
      setTimeout(function () { t.remove(); }, 300);
    }, 2200);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ============================================================
  // 复制到剪贴板
  // ============================================================
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-copy]');
    if (!target) return;
    e.preventDefault();
    var text = target.getAttribute('data-copy');
    copyToClipboard(text).then(function () {
      showToast('已复制到剪贴板');
    }).catch(function () {
      showToast('复制失败,请手动选择', 'error');
    });
    addRipple(e, target);
  });

  // ============================================================
  // 按钮涟漪效果
  // ============================================================
  function addRipple(e, el) {
    if (REDUCED) return;
    var rect = el.getBoundingClientRect();
    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    var size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    el.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 600);
  }

  // ============================================================
  // 二维码 Modal (纯 JS,无第三方)
  // ============================================================
  var qrModal = document.getElementById('qr-modal');
  var qrImg = document.getElementById('qr-modal-img');
  var qrTitle = document.getElementById('qr-modal-title');
  var qrUrl = document.getElementById('qr-modal-url');
  var qrClose = document.getElementById('qr-modal-close');

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-qr]');
    if (!trigger) return;
    e.preventDefault();
    var url = trigger.getAttribute('data-qr');
    var title = trigger.getAttribute('data-qr-title') || '二维码';
    if (typeof QR === 'undefined' || !QR.svgString) {
      showToast('二维码库未加载', 'error');
      return;
    }
    QR.renderTo(qrImg, url, { ecl: 'M', margin: 4, alt: title });
    qrTitle.textContent = title;
    qrUrl.textContent = url;
    qrModal.classList.add('is-open');
    qrModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  });

  function closeQrModal() {
    qrModal.classList.remove('is-open');
    qrModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  if (qrClose) qrClose.addEventListener('click', closeQrModal);
  if (qrModal) {
    qrModal.addEventListener('click', function (e) {
      if (e.target === qrModal) closeQrModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && qrModal && qrModal.classList.contains('is-open')) closeQrModal();
  });

  // ============================================================
  // CountUp 数字递增动画 (IntersectionObserver 触发)
  // ============================================================
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-countup'));
    if (isNaN(target)) return;
    var decimal = parseInt(el.getAttribute('data-decimal') || '0', 10);
    if (REDUCED) {
      el.textContent = formatNum(target, decimal);
      return;
    }
    var duration = 1100;
    var start = performance.now();
    function tick(now) {
      var t = Math.min((now - start) / duration, 1);
      var val = target * easeOutCubic(t);
      el.textContent = formatNum(val, decimal);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = formatNum(target, decimal);
    }
    requestAnimationFrame(tick);
  }

  function formatNum(v, decimal) {
    if (decimal > 0) return v.toFixed(decimal);
    return Math.round(v).toLocaleString();
  }

  function initCountUp() {
    var els = document.querySelectorAll('[data-countup]');
    if (!els.length) return;
    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach(countUp);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    els.forEach(function (el) { io.observe(el); });
  }

  // ============================================================
  // 3D 倾斜效果 (仅桌面 + 非 reduced-motion)
  // ============================================================
  function bindTilt() {
    if (REDUCED || MOBILE) return;
    var els = document.querySelectorAll('[data-tilt]');
    els.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform = 'perspective(1000px) rotateY(' + (x * 6) + 'deg) rotateX(' + (-y * 6) + 'deg)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  // ============================================================
  // 协议环形 SVG 填充 (动画 + fallback 色)
  // ============================================================
  var PROTO_COLORS = {
    vmess: '#00d9ff', vless: '#5ee7ff', ss: '#b465ff',
    trojan: '#ff7847', hysteria2: '#3fb950', hysteria: '#3fb950',
    tuic: '#d29922'
  };
  var FALLBACK_COLOR = '#8b949e';

  function initProtoRings() {
    var rings = document.querySelectorAll('.proto-ring');
    rings.forEach(function (ring) {
      var fg = ring.querySelector('.ring-fg');
      var pctEl = ring.querySelector('[data-ring-pct]');
      if (!fg || !pctEl) return;
      var pct = parseFloat(pctEl.getAttribute('data-ring-pct')) || 0;
      var protoName = ring.getAttribute('data-proto-name') || '';
      var color = PROTO_COLORS[protoName] || FALLBACK_COLOR;
      fg.style.stroke = color;
      fg.style.color = color;
      var r = parseFloat(fg.getAttribute('r'));
      var circumference = 2 * Math.PI * r;
      fg.style.strokeDasharray = circumference;
      if (REDUCED) {
        fg.style.strokeDashoffset = circumference * (1 - pct / 100);
      } else {
        fg.style.strokeDashoffset = circumference;
        requestAnimationFrame(function () {
          setTimeout(function () {
            fg.style.strokeDashoffset = circumference * (1 - pct / 100);
          }, 50);
        });
      }
    });
  }

  // ============================================================
  // 导航高亮
  // ============================================================
  function initNavActive() {
    var path = window.location.pathname.replace(/\/$/, '');
    if (!path) path = '/';
    document.querySelectorAll('.site-nav a[data-nav]').forEach(function (a) {
      var nav = a.getAttribute('data-nav');
      if (path === nav || (nav !== '/' && path.indexOf(nav) === 0)) {
        a.classList.add('is-active');
      }
    });
  }

  // ============================================================
  // 站内搜索 (纯 JS fuzzy search)
  // ============================================================
  function fuzzyMatch(query, text) {
    query = query.toLowerCase();
    text = text.toLowerCase();
    if (!query) return true;
    if (text.indexOf(query) !== -1) return true;
    var qi = 0;
    for (var ti = 0; ti < text.length && qi < query.length; ti++) {
      if (text[ti] === query[qi]) qi++;
    }
    return qi === query.length;
  }

  function collectSearchIndex() {
    var items = [];
    // 数据源
    (window.SITE_DATA && window.SITE_DATA.sources || []).forEach(function (s) {
      items.push({
        icon: '📡', name: s.name, meta: '数据源 · ' + (s.reliability || 0) + '%',
        url: '/sources.html', group: '数据源'
      });
    });
    // 协议
    (window.SITE_DATA && window.SITE_DATA.protocols || []).forEach(function (p) {
      items.push({
        icon: p.icon, name: p.name, meta: '协议',
        url: '/guides.html', group: '协议'
      });
    });
    // 客户端
    (window.SITE_DATA && window.SITE_DATA.clients || []).forEach(function (c) {
      items.push({
        icon: '⬇', name: c.name, meta: '客户端 · ' + c.platform,
        url: '/guides.html', group: '客户端'
      });
    });
    // 订阅
    (window.SITE_DATA && window.SITE_DATA.subscriptions || []).forEach(function (s) {
      items.push({
        icon: s.icon, name: s.title, meta: '订阅 · ' + s.format,
        url: '/', group: '订阅'
      });
    });
    // 静态导航
    items.push({ icon: '📡', name: '数据源目录', meta: '页面', url: '/sources.html', group: '页面' });
    items.push({ icon: '📖', name: '协议与客户端指南', meta: '页面', url: '/guides.html', group: '页面' });
    items.push({ icon: 'ℹ️', name: '关于', meta: '页面', url: '/about.html', group: '页面' });
    return items;
  }

  function renderSearchResults(query) {
    var container = document.getElementById('search-results');
    if (!container) return;
    if (!query.trim()) {
      container.hidden = true;
      container.innerHTML = '';
      return;
    }
    var all = collectSearchIndex();
    var matched = all.filter(function (item) {
      return fuzzyMatch(query, item.name) || fuzzyMatch(query, item.meta);
    });
    if (!matched.length) {
      container.innerHTML = '<div class="empty">无匹配结果</div>';
      container.hidden = false;
      return;
    }
    // 按组分类
    var groups = {};
    matched.forEach(function (m) {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    });
    var html = '';
    Object.keys(groups).forEach(function (g) {
      html += '<div class="result-group"><div class="result-group-title">' + escapeHtml(g) + '</div>';
      groups[g].forEach(function (item) {
        var base = document.querySelector('base');
        var baseHref = base ? base.getAttribute('href') : '';
        var url = item.url;
        if (baseHref) url = baseHref.replace(/\/$/, '') + url;
        html += '<a class="result-item" href="' + escapeHtml(url) + '">' +
          '<span class="ri-icon">' + escapeHtml(item.icon) + '</span>' +
          '<span class="ri-name">' + escapeHtml(item.name) + '</span>' +
          '<span class="ri-meta">' + escapeHtml(item.meta) + '</span>' +
        '</a>';
      });
      html += '</div>';
    });
    container.innerHTML = html;
    container.hidden = false;
  }

  function initSearch() {
    var input = document.getElementById('search-input');
    if (!input) return;
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value;
      timer = setTimeout(function () { renderSearchResults(q); }, 120);
    });
    input.addEventListener('focus', function () {
      if (input.value) renderSearchResults(input.value);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#nav-search')) {
        var r = document.getElementById('search-results');
        if (r) r.hidden = true;
      }
    });
    // 快捷键 / 聚焦搜索
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== input && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        input.focus();
      }
      if (e.key === 'Escape' && document.activeElement === input) {
        input.value = '';
        input.blur();
        var r = document.getElementById('search-results');
        if (r) r.hidden = true;
      }
    });
  }

  // ============================================================
  // 数据源筛选 (sources.html 用)
  // ============================================================
  function initSourceFilter() {
    var buttons = document.querySelectorAll('.filter-btn');
    var cards = document.querySelectorAll('[data-source-status]');
    if (!buttons.length || !cards.length) return;

    function updateCount() {
      var counts = { all: 0, active: 0, observing: 0, disabled: 0 };
      cards.forEach(function (c) {
        var s = c.getAttribute('data-source-status');
        counts.all++;
        if (counts[s] !== undefined) counts[s]++;
      });
      Object.keys(counts).forEach(function (k) {
        var el = document.querySelector('[data-count="' + k + '"]');
        if (el) el.textContent = counts[k];
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-filter');
        buttons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        cards.forEach(function (card) {
          var s = card.getAttribute('data-source-status');
          var show = filter === 'all' || s === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
    updateCount();
  }

  // ============================================================
  // 订阅可达性检测 (HEAD 探活,失败自动展开镜像列表)
  // ============================================================
  function checkSubscriptions() {
    var subCards = document.querySelectorAll('.sub-card');
    if (!subCards.length) return;
    subCards.forEach(function (card) {
      var primaryUrl = card.querySelector('[data-copy]');
      if (!primaryUrl) return;
      var url = primaryUrl.getAttribute('data-copy');
      // 用 fetch HEAD 探活,5s 超时
      var controller = ('AbortController' in window) ? new AbortController() : null;
      var timeoutId = setTimeout(function () {
        if (controller) controller.abort();
      }, 5000);
      fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller ? controller.signal : undefined })
        .then(function () {
          markSubStatus(card, 'ok');
        })
        .catch(function () {
          markSubStatus(card, 'down');
        })
        .finally(function () { clearTimeout(timeoutId); });
    });
  }

  function markSubStatus(card, status) {
    var linkEl = card.querySelector('.sub-card-link');
    var mirrorsEl = card.querySelector('.sub-card-mirrors');
    var statusDot = document.createElement('span');
    statusDot.className = 'sub-status';
    if (status === 'ok') {
      statusDot.style.cssText = 'color: var(--color-success); font-size: 11px; margin-left: 6px;';
      statusDot.textContent = '✓ 在线';
      if (linkEl) linkEl.appendChild(statusDot);
    } else {
      statusDot.style.cssText = 'color: var(--color-danger); font-size: 11px; margin-left: 6px;';
      statusDot.textContent = '✕ 不可达,请用镜像';
      if (linkEl) linkEl.appendChild(statusDot);
      // 自动展开镜像列表
      if (mirrorsEl && mirrorsEl.hasAttribute('open') === false) {
        mirrorsEl.setAttribute('open', '');
        mirrorsEl.style.borderColor = 'rgba(248, 81, 73, 0.3)';
      }
    }
  }

  // ============================================================
  // 启动
  // ============================================================
  function init() {
    initNavActive();
    initCountUp();
    bindTilt();
    initProtoRings();
    initSearch();
    initSourceFilter();
    checkSubscriptions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

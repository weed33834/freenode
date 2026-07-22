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
    // 视觉反馈:按钮短暂切到"已复制"状态,与 toast 互补,提升连贯感
    var origHTML = target.innerHTML;
    var origWidth = target.style.width;
    target.style.width = target.offsetWidth + 'px'; // 锁宽避免抖动
    target.classList.add('is-copied');
    copyToClipboard(text).then(function () {
      target.innerHTML = '✓ 已复制';
      showToast('已复制到剪贴板');
    }).catch(function () {
      target.innerHTML = '✕ 失败';
      showToast('复制失败,请手动选择', 'error');
    }).then(function () {
      setTimeout(function () {
        target.innerHTML = origHTML;
        target.classList.remove('is-copied');
        target.style.width = origWidth;
      }, 1300);
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
    var raw = el.getAttribute('data-countup');
    var target = parseFloat(raw);
    if (isNaN(target)) {
      // 目标为空 (如验证未跑时 alive_nodes=null),显示 — 而非误导性的 0
      el.textContent = raw && raw.trim() ? raw : '—';
      return;
    }
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
  // 导航高亮 (行内 nav + 移动端菜单面板)
  // ============================================================
  function initNavActive() {
    var path = window.location.pathname.replace(/\/$/, '');
    if (!path) path = '/';
    document.querySelectorAll('.site-nav a[data-nav], .nav-menu-panel a[data-nav]').forEach(function (a) {
      var nav = a.getAttribute('data-nav');
      if (path === nav || (nav !== '/' && path.indexOf(nav) === 0)) {
        a.classList.add('is-active');
      }
    });
  }

  // ============================================================
  // 移动端汉堡菜单
  // ============================================================
  function initMobileMenu() {
    var toggle = document.getElementById('nav-menu-toggle');
    var panel = document.getElementById('nav-menu-panel');
    if (!toggle || !panel) return;

    function openMenu() {
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      // 打开菜单时关闭搜索浮层 (互斥)
      closeMobileSearch();
    }
    function closeMenu() {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', function () {
      if (panel.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
    // 点击菜单内链接后自动关闭 (外链也会关,体验一致)
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
    // 点击外部关闭
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#nav-menu-panel') && !e.target.closest('#nav-menu-toggle')) {
        closeMenu();
      }
    });
    // Esc 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) closeMenu();
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

  function renderSearchResults(query, container) {
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

  // 绑定单个搜索 input + 其结果容器
  function bindSearchInput(input, resultsEl) {
    if (!input) return;
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value;
      timer = setTimeout(function () { renderSearchResults(q, resultsEl); }, 120);
    });
    input.addEventListener('focus', function () {
      if (input.value) renderSearchResults(input.value, resultsEl);
    });
  }

  // 移动端搜索浮层开关
  function openMobileSearch() {
    var overlay = document.getElementById('nav-search-overlay');
    var toggle = document.getElementById('nav-search-toggle');
    var input = document.getElementById('search-input-mobile');
    if (!overlay) return;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    if (toggle) { toggle.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); }
    if (input) setTimeout(function () { input.focus(); }, 50);
    // 打开搜索时关闭菜单 (互斥)
    var menuPanel = document.getElementById('nav-menu-panel');
    var menuToggle = document.getElementById('nav-menu-toggle');
    if (menuPanel) { menuPanel.classList.remove('is-open'); menuPanel.setAttribute('aria-hidden', 'true'); }
    if (menuToggle) { menuToggle.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); }
  }
  function closeMobileSearch() {
    var overlay = document.getElementById('nav-search-overlay');
    var toggle = document.getElementById('nav-search-toggle');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    if (toggle) { toggle.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
  }

  function initSearch() {
    // 桌面行内搜索
    var desktopInput = document.getElementById('search-input');
    var desktopResults = document.getElementById('search-results');
    bindSearchInput(desktopInput, desktopResults);

    // 移动端浮层搜索
    var mobileInput = document.getElementById('search-input-mobile');
    var mobileResults = document.getElementById('search-results-mobile');
    bindSearchInput(mobileInput, mobileResults);

    // 移动端 toggle 按钮
    var toggle = document.getElementById('nav-search-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var overlay = document.getElementById('nav-search-overlay');
        if (overlay && overlay.classList.contains('is-open')) closeMobileSearch();
        else openMobileSearch();
      });
    }

    // 点击外部关闭对应结果/浮层
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#nav-search')) {
        if (desktopResults) desktopResults.hidden = true;
      }
      if (!e.target.closest('#nav-search-overlay') && !e.target.closest('#nav-search-toggle')) {
        closeMobileSearch();
      }
    });

    // 快捷键:桌面聚焦行内,移动端打开浮层
    document.addEventListener('keydown', function (e) {
      var active = document.activeElement;
      var inDesktop = active === desktopInput;
      var inMobile = active === mobileInput;
      if (e.key === '/' && !inDesktop && !inMobile && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // 视口宽度判断走哪个入口
        if (window.innerWidth <= 980) openMobileSearch();
        else if (desktopInput) desktopInput.focus();
      }
      if (e.key === 'Escape') {
        if (inDesktop && desktopInput) {
          desktopInput.value = '';
          desktopInput.blur();
          if (desktopResults) desktopResults.hidden = true;
        }
        if (inMobile) closeMobileSearch();
        // 浮层打开时 Esc 也关
        var overlay = document.getElementById('nav-search-overlay');
        if (overlay && overlay.classList.contains('is-open') && !inMobile) closeMobileSearch();
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
  // 订阅状态标记
  //   跨源 raw 文件无法可靠探测可达性 (no-cors 读不到 status,部分源在浏览器 abort),
  //   且探测结果不稳定 (不同视口/网络环境抖动),给用户造成"不连贯"观感。
  //   文件由仓库提交即视为已发布,直接标静态 "✓ 已生成" 徽标,
  //   镜像列表折叠保留,用户按需展开。不再做易误报的 fetch 探活。
  // ============================================================
  function markSubscriptions() {
    var subCards = document.querySelectorAll('.sub-card');
    if (!subCards.length) return;
    subCards.forEach(function (card) {
      markSubStatus(card, 'ok');
    });
  }

  function markSubStatus(card, status) {
    var linkEl = card.querySelector('.sub-card-link');
    if (!linkEl || linkEl.querySelector('.sub-status')) return;
    var statusDot = document.createElement('span');
    statusDot.className = 'sub-status';
    statusDot.style.cssText = 'color: var(--color-success); font-size: 11px; margin-left: 6px;';
    statusDot.textContent = '✓ 已生成';
    linkEl.appendChild(statusDot);
  }

  // ============================================================
  // 启动
  // ============================================================
  function init() {
    initNavActive();
    initMobileMenu();
    initCountUp();
    bindTilt();
    initProtoRings();
    initSearch();
    initSourceFilter();
    markSubscriptions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

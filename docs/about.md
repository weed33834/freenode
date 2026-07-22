---
layout: default
title: 关于
---

<h1 class="page-title">ℹ️ 关于 FreeNode</h1>
<p class="page-subtitle">// 开源 · 社区驱动 · MIT 协议</p>

<div class="markdown-content">
  <p>FreeNode 是一个免费公开节点 / 代理订阅源的<strong>聚合采集仓库</strong>。</p>

  <h2>工作原理</h2>
  <p>数据流水线在 GitHub Actions 中跑,触发后跑完创建 PR,owner 审核后合并、部署:</p>
  <ol>
    <li><strong>crawler</strong> — 并发抓取所有启用数据源 (httpx + 流式 <code>max_bytes</code> 上限),按 reliability 分级并发 + 指数退避重试。</li>
    <li><strong>parser</strong> — 从原始文本里解析 <code>vmess</code> / <code>vless</code> / <code>ss</code> / <code>trojan</code> / <code>hysteria2</code> / <code>tuic</code> 等协议链接。</li>
    <li><strong>dedup</strong> — 按 <code>(protocol, server, port, auth_secret)</code> 指纹去重。</li>
    <li><strong>verifier</strong> — TCP connect + 协议握手二段验证,过滤死节点。</li>
    <li><strong>formatter</strong> — 输出 <code>clash.yaml</code> / <code>v2ray.txt</code> / <code>proxies.txt</code> + 质量报告。</li>
    <li><strong>site_builder</strong> — 把上述数据合成 <code>_data/*.json</code>,本站自动渲染。</li>
  </ol>

  <h2>数据源</h2>
  <p>所有源均来自社区公开渠道。新加的源会先进「观察区」(<code>status=observing</code>),
     连续 3 天 <code>reliability &gt; 70%</code> 才升级为正式启用。详见
     <a href="{{ '/sources.html' | relative_url }}">数据源目录</a>。</p>

  <h2>开源</h2>
  <p>本仓库基于 MIT 协议开源,欢迎在
     <a href="{{ site.data.site.repo_urls.gitcode }}" target="_blank" rel="noopener">GitCode</a> 或
     <a href="{{ site.data.site.repo_urls.github }}" target="_blank" rel="noopener">GitHub</a> 提 Issue / PR 贡献新的数据源或修复 Bug。</p>

  <h2>免责声明</h2>
  <p>本项目仅供网络协议学习、安全测试与隐私技术研究。所有节点来自第三方公开渠道,
     我们不拥有、运营或保证它们。请勿用于银行、支付或任何敏感登录。遵守您所在地的法律。</p>
</div>

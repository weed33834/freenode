---
layout: default
title: About
description: FreeNode — open-source free public proxy / node subscription source aggregator. Learn how the pipeline crawls, parses, dedupes and verifies 80+ community sources.
keywords: freenode, about, open source, proxy aggregator, node subscription, github pages, clash, v2ray, vmess, vless, trojan, shadowsocks
---

<h1 class="page-title">ℹ️ About FreeNode</h1>
<p class="page-subtitle">// Open source · Community-driven · MIT licensed</p>

<div class="markdown-content">
  <p><strong>FreeNode</strong> is an open-source aggregator of free public proxy /
     node subscription sources. It crawls 80+ community channels, parses 6 protocols,
     deduplicates by fingerprint, verifies reachability via TCP + protocol handshake,
     and outputs ready-to-use subscription files in three formats.</p>

  <h2>How it works</h2>
  <p>The data pipeline runs in GitHub Actions on manual trigger. When done, it opens
     a Pull Request — the owner reviews and merges, which triggers Pages redeploy:</p>
  <ol>
    <li><strong>crawler</strong> — concurrent fetch of all enabled sources (httpx +
        streaming <code>max_bytes</code> cap), reliability-tiered concurrency +
        exponential backoff retries + HTTP 429 Retry-After handling.</li>
    <li><strong>parser</strong> — extracts <code>vmess</code> / <code>vless</code> /
        <code>ss</code> / <code>trojan</code> / <code>hysteria2</code> / <code>tuic</code>
        protocol links from raw text.</li>
    <li><strong>dedup</strong> — fingerprint by <code>(protocol, server, port, auth_secret)</code>
        to eliminate duplicates across sources.</li>
    <li><strong>verifier</strong> — TCP connect + protocol handshake (TLS / SS probe)
        two-stage verification; flaky failures (timeout, network unreachable) retried.</li>
    <li><strong>formatter</strong> — outputs <code>clash.yaml</code> /
        <code>v2ray.txt</code> / <code>proxies.txt</code> + quality report
        (<code>quality.json</code>).</li>
    <li><strong>site_builder</strong> — composes the above into <code>_data/*.json</code>
        that this Jekyll site renders.</li>
  </ol>

  <h2>Data sources</h2>
  <p>All sources come from community public channels (GitHub raw files, subscription
     endpoints, Telegram channels). New sources enter <strong>observation mode</strong>
     (<code>status=observing</code>) and must sustain <code>reliability &gt; 70%</code>
     for 3 consecutive days before being promoted to <code>active</code>. Sources
     below 30% for 7 days are demoted back to observation. See the live
     <a href="{{ '/sources.html' | relative_url }}">Sources Directory</a>.</p>

  <h2>Open source</h2>
  <p>This repository is open source under the MIT license. Contributions of new data
     sources or bug fixes are welcome on
     <a href="{{ site.data.site.repo_urls.gitcode }}" target="_blank" rel="noopener">GitCode</a> or
     <a href="{{ site.data.site.repo_urls.github }}" target="_blank" rel="noopener">GitHub</a>
     via Issue or Pull Request. See <a href="{{ '/guides.html' | relative_url }}">the guide</a>
     for client setup help.</p>

  <h2>Disclaimer</h2>
  <p>This project is for network protocol learning, security testing and privacy
     research only. All nodes come from third-party public sources; we do not own,
     operate or guarantee them. Do not use for banking, payments or any sensitive
     login. Follow your local laws.</p>
</div>

# Changelog

This project follows [Semantic Versioning](https://semver.org/).

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Website visual rebuild: cyberpunk theme + glass morphism + protocol ring SVG
- In-site search (fuzzy search + `/` shortcut)
- Data freshness indicator (fresh / stale / outdated)
- Pure-JS inline QR code generation (no third-party API dependency)
- Data snapshot archival (`nodes/archive/YYYY-MMDD/`, 30-day retention, for rollback)
- Flaky-failure verify retry (`FREENODE_VERIFY_RETRIES`, reduces false negatives)
- Pre-verify truncation cap (`FREENODE_VERIFY_CAP`, prevents node-spike time blowups)
- Suspicious-network blacklist (`FREENODE_SUSPICIOUS_NETS`, honeypot / Tor-exit guard)
- Subscription reachability probe (front-end HEAD check, auto-expands mirror on failure)
- SEO basics (Open Graph / Twitter Card / sitemap.xml / robots.txt)
- Jekyll include component system (section-title / stat-card / sub-card / meta-seo)

### Changed
- GitHub Actions switched to manual trigger + PR mode (no more scheduled cron)
- Workflow adds a jekyll build verification step (no PR created on failure)
- Workflow adds an auto-close step for stale PRs (prevents PR pile-up)
- Color palette consolidated: 3 main neon × 17 colors → cyan primary + purple accent + semantic colors
- Font loading made async with onerror fallback (avoids white-screen when Google Fonts is blocked)
- Sources directory switched to a card grid (mobile-friendly)

### Fixed
- Crawler now backs off on HTTP 429 + Retry-After
- Copy/mechanism mismatch ("daily auto" → "manual trigger + PR")
- Mobile backdrop-filter full-screen caused lag
- prefers-reduced-motion JS degradation (CountUp/Tilt/Ripple)

## [1.0.0] - 2026-07-16

### Added
- Initial release: node-collection pipeline (crawler/parser/dedup/verifier/formatter)
- 6-protocol parsing (vmess/vless/ss/trojan/hysteria/hysteria2/tuic)
- Two-stage verification (TCP + protocol handshake)
- 84 community public data sources
- Clash / V2Ray / proxy list subscription output in three formats
- 14-day rolling data-source reliability report
- New-source gradual promotion (observing → active)
- GitHub Actions automation
- Jekyll site (home / sources directory / protocol guide / about)
- Full test suite (171 tests)

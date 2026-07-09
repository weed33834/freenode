# Security Audit Report — FreeNode

**Audit date:** 2026-07-04
**Auditor:** Automated security review (GLM-5.2)
**Scope:** `scripts/` data pipeline + `backend/app/core/` crypto & security modules
**Target version:** 1.4.0

## Audit Scope

This audit reviewed the components that ingest, parse, verify, and render
untrusted node/proxy data, plus the backend's secret-handling primitives:

| File | Role |
|------|------|
| `scripts/crawler.py` | Concurrent fetcher for remote sources (read-only review) |
| `scripts/utils.py` | `validate_url`, `is_private_host`, `safe_b64decode` |
| `scripts/parser.py` | Parses `ss/vmess/vless/trojan/hysteria/hysteria2/tuic` links |
| `scripts/verifier.py` | TCP liveness check + GeoIP lookup for parsed nodes |
| `scripts/formatter.py` | Renders Clash YAML / V2Ray subscription / proxy lists |
| `backend/app/core/crypto.py` | AES-GCM encryption of node secrets |
| `backend/app/core/security.py` | Admin API-key authentication |
| `.env.example`, `backend/.env.example` | Secret template hygiene |
| Git history | Secret leakage scan |

The audit focused on five risk classes: SSRF, parser memory exhaustion,
verifier resource leaks, secret management, and input injection.

---

## Summary

| Severity | Count | Fixed | Documented |
|----------|-------|-------|------------|
| Critical | 0 | 0 | 0 |
| High | 2 | 2 | 0 |
| Medium | 4 | 2 | 2 |
| Low | 5 | 1 | 4 |
| Info | 4 | 0 | 4 |

No Critical issues were found. No real secrets were leaked in git history
or `.env.example` files. The crawler's strict allow-list (HTTPS-only, limited
to `raw.githubusercontent.com` / `gitcode.com` / `api.gitcode.com`) already
provides strong SSRF mitigation at the fetch layer; the findings below are
in the node-parsing/verification path where attacker-controlled links reach
the server.

All fixes are backward-compatible and covered by
`tests/test_security_hardening.py`. The existing test suite (76 tests across
`test_utils` / `test_parser` / `test_verifier` / `test_security_hardening`)
continues to pass.

---

## Findings

### HIGH-1: Parser memory exhaustion via unbounded Base64 decoding
**Severity:** High
**File:** `scripts/utils.py` — `safe_b64decode`
**Status:** Fixed

**Description.** `safe_b64decode` accepted arbitrarily long input strings and
decoded them in full. Because it is used by `decode_vmess` and `parse_ss_link`
on attacker-controlled link payloads, a single multi-gigabyte `vmess://` /
`ss://` link would be fully materialised in memory before any validation ran.
A malicious source could submit a subscription file containing one such link
to OOM-kill the pipeline worker.

**Impact.** Denial of service via memory exhaustion of the parse worker;
possible OOM crash of the whole update process since parsing runs in-process.

**Fix.** Added `MAX_B64_DECODE_LEN = 256 KiB` input cap in `safe_b64decode`
(rejects over-long input and logs a warning), plus `MAX_VMESS_LINK_LEN = 512 KiB`
link-level guard in `decode_vmess` so the rejection happens before the base64
payload is even sliced. 256 KiB is far above any legitimate single-node config
(typically < 1 KiB) while bounding worst-case memory to a few hundred KiB.

**Test.** `test_parser_size_limit` verifies that an over-length base64 input
and an over-length vmess link are both rejected, and that normal-sized payloads
still decode.

---

### HIGH-2: Verifier opened TCP connections to private IPs (DNS rebinding TOCTOU)
**Severity:** High
**File:** `scripts/verifier.py` — `verify_node`
**Status:** Fixed

**Description.** The previous flow was:
1. `is_private_host(host)` — blocks literal private hostnames/IPs.
2. `tcp_check(host, port)` — **opens a TCP connection** (DNS resolution happens here).
3. `resolve_ip(host)` then `is_private_host(ip)` — blocks if the resolved IP is private.

The DNS-rebinding defence only ran *after* the connection had already been
established. If an attacker submitted a node whose domain resolved to
`169.254.169.254` (cloud metadata) or an internal service, the verifier would
open a real TCP connection to that internal target and only afterwards mark
the node dead. While a bare `socket.create_connection` does not exfiltrate
data (no HTTP request is sent), it still enables internal TCP port probing
from the server's vantage point — a classic SSRF primitive.

**Impact.** SSRF allowing internal network/port probing from the verifier
host; reachable metadata endpoints could be port-scanned.

**Fix.** Moved `resolve_ip` + `is_private_host(ip)` to run **before**
`tcp_check`. A node whose DNS statically resolves to a private/reserved IP is
now rejected without any TCP connection being made. The resolved IP is reused
for the GeoIP lookup. A narrow theoretical TOCTOU remains between the
pre-check resolve and the connect's internal resolve (documented in code);
fully closing it would require connecting to the resolved IP literal, which
breaks TLS SNI.

**Test.** Existing `test_verify_node_dns_rebinding` continues to pass (now
exercises the pre-connect path); `test_verifier_socket_closed_on_error` was
added to confirm no socket leak on any code path.

---

### MEDIUM-1: `validate_url` did not IP-check the host
**Severity:** Medium
**File:** `scripts/utils.py` — `validate_url`
**Status:** Fixed

**Description.** `validate_url` only checked the host against the allow-list.
The allow-list is a strict whitelist of public CDNs, so the crawler path was
already well-protected. However, operators can extend the list via
`FREENODE_ALLOWED_HOSTS`. If an operator mistakenly added an internal IP or
hostname to that env var, `validate_url` would happily accept
`https://169.254.169.254/...`.

**Impact.** Defence-in-depth gap; exploitable only via operator
misconfiguration of `FREENODE_ALLOWED_HOSTS`.

**Fix.** Added an `is_private_host(host)` check before the allow-list check.
Any private/reserved/loopback/link-local/non-global IP literal is now rejected
regardless of allow-list membership.

**Tests.** `test_validate_url_blocks_metadata_endpoint`,
`test_validate_url_blocks_ipv6_mapped` (both set the dangerous host into the
allow-list and confirm it is still rejected).

---

### MEDIUM-2: `is_private_host` missed CGNAT and relied on version-specific behaviour
**Severity:** Medium
**File:** `scripts/utils.py` — `is_private_host`
**Status:** Fixed

**Description.** The original implementation relied on
`ipaddress.ip_address(x).is_private` (and friends). Two gaps:
- CGNAT shared address space `100.64.0.0/10` (RFC 6598) is **not** marked
  `is_private` by CPython, so `100.64.0.1` was treated as a public, reachable
  host. CGNAT addresses are non-globally-routable and should not be probe
  targets.
- IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`) *are* handled correctly by
  CPython 3.12, but the behaviour is version-dependent; relying on it is
  fragile.

**Impact.** CGNAT-range hosts could be probed by the verifier; future Python
versions could silently regress IPv4-mapped detection.

**Fix.** Refactored into a `_is_risky_ip` helper that:
- Extracts `ipv4_mapped` from IPv6 addresses and re-checks the embedded IPv4
  explicitly (version-independent).
- Adds `not ip.is_global` as a catch-all that covers CGNAT, TEST-NET
  (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), and other
  non-routable ranges, while keeping the explicit `is_multicast` check
  (multicast `224.0.0.1` reports `is_global=True` but must still be blocked).
- Strips whitespace from the host for robustness.

**Tests.** `test_is_private_host_ipv6_mapped`, `test_is_private_host_cgnat_blocked`.

---

### MEDIUM-3: Verifier DNS-rebinding TOCTOU (residual)
**Severity:** Medium
**File:** `scripts/verifier.py` — `verify_node`
**Status:** Documented (residual after HIGH-2 fix)

**Description.** Even after HIGH-2, a narrow TOCTOU window remains: the
pre-check `resolve_ip` call and the DNS resolution performed inside
`socket.create_connection` are two separate lookups. An attacker controlling
an authoritative DNS server that flips between a public and a private answer
could in theory pass the pre-check and then have `create_connection` connect
to the private address.

**Impact.** Low in practice — requires attacker-controlled DNS for the
node's domain and a tight race window. The connection still yields no data
(the verifier sends no application-layer request).

**Recommendation.** To fully close this, resolve once, validate the IP, then
`socket.create_connection((ip, port))` and set TLS SNI/Host separately. This
is a larger refactor that touches latency measurement and TLS handling and is
deferred. The current pre-check already blocks the static-DNS-to-private
attack which is the realistic threat.

---

### MEDIUM-4: AES-GCM silently degrades to plaintext when no key is configured
**Severity:** Medium
**File:** `backend/app/core/crypto.py`
**Status:** Documented (intentional design)

**Description.** When `FREENODE_SECRET_KEY_HEX` is empty, `encrypt` /
`decrypt` are identity functions: node secrets (passwords, UUIDs) are stored
in plaintext in the database. This is documented as "dev only" in
`backend/.env.example` and `app/config.py`, but there is no startup warning
or production guard. An operator who forgets to set the key in production
gets silent plaintext storage with no signal.

**Impact.** Plaintext storage of node credentials if the key is unset in
production.

**Recommendation.** Emit a loud startup log warning when `secret_key_hex` is
empty and `debug=False`, or fail-fast in non-debug mode. Not changed in this
pass to preserve the documented dev workflow and existing tests
(`test_encrypt_without_key_returns_plaintext`).

**Note on the AES-GCM implementation itself:** the crypto is correct —
`AESGCM` from `cryptography`, 12-byte random nonce per encryption, nonce
prepended to ciphertext, constant-time-ish failure on decrypt (re-raised as
`ValueError`). No nonce-reuse risk. Key length is not explicitly validated
(`bytes.fromhex` + `AESGCM` will raise on wrong size), which is Low but not
exploitable.

---

### LOW-1: `resolve_ip` creates a fresh `ThreadPoolExecutor` per call
**Severity:** Low
**File:** `scripts/verifier.py` — `resolve_ip`
**Status:** Documented

**Description.** `resolve_ip` spins up a `ThreadPoolExecutor(max_workers=1)`
for each address family on every node verification. With 50 workers verifying
thousands of nodes, this creates and tears down ~2 executors per node. No
leak (the `with` block cleans up), but wasteful.

**Recommendation.** Resolve via `socket.getaddrinfo` with a thread-level
timeout wrapper shared across calls, or cap concurrency centrally. Deferred.

---

### LOW-2: IDN / homograph domain handling not explicit
**Severity:** Low
**File:** `scripts/utils.py` — `validate_url`
**Status:** Documented

**Description.** `validate_url` compares the raw `urlparse` hostname against
the allow-list. Punycode (`xn--...`) hosts are compared literally. Because the
allow-list is a strict whitelist of three specific public CDNs, IDN homograph
attacks are **not** exploitable here (an attacker cannot register
`raw.githubusercontent.com` in any script). The risk would only materialise
if the allow-list were loosened to accept arbitrary user-supplied domains.

**Recommendation.** If the allow-list is ever opened to user-supplied
domains, normalise via `idna` encoding and reject mixed-script lookalikes.

---

### LOW-3: `crawler.maybe_decode_base64` has no input size cap
**Severity:** Low
**File:** `scripts/crawler.py` — `maybe_decode_base64`
**Status:** Documented (file out of edit scope)

**Description.** `maybe_decode_base64` calls `base64.b64decode` on the whole
fetched text with no length cap. The fetcher already bounds responses via
`curl --max-filesize` / `max_bytes`, so the input is bounded upstream, but a
defensive cap here would be belt-and-suspenders. `crawler.py` is outside the
allowed edit set for this pass.

**Recommendation.** Add a length guard mirroring `MAX_B64_DECODE_LEN`.

---

### LOW-4: `to_proxy_list` does not strip control characters from proxy URLs
**Severity:** Low
**File:** `scripts/formatter.py` — `to_proxy_list`
**Status:** Documented

**Description.** `to_proxy_list` writes proxy URLs verbatim (after the
private-host filter). A proxy URL containing a literal newline would inject
an extra line into `proxies.txt`. In practice `parse_proxy_api_response`
matches `^(http|https|socks4|socks5)://` on stripped lines, so newlines cannot
reach this function, but the defence is implicit.

**Recommendation.** Reject or sanitise proxy URLs containing control
characters before writing.

---

### LOW-5: No explicit AES key-length validation
**Severity:** Low
**File:** `backend/app/core/crypto.py`
**Status:** Documented

**Description.** `bytes.fromhex(key_hex)` is passed straight to `AESGCM`,
which raises a generic `ValueError` on unsupported key sizes. A dedicated
check would give operators a clearer error. Not exploitable.

---

### INFO-1: `security.py` admin API key uses constant-time comparison
**Severity:** Info
**File:** `backend/app/core/security.py`
**Status:** No action needed

**Description.** `require_admin` uses `secrets.compare_digest` for the API
key comparison (constant-time, no early-exit). Returns 503 when no key is
configured (admin disabled) and 401 on mismatch. Correct implementation.

---

### INFO-2: No leaked secrets in git history or `.env.example`
**Severity:** Info
**Status:** No action needed

**Description.** A scan of `git log --all -p` for secret-like patterns
(`api_key`, `secret`, `token`, `password` assignments to long values) found
only test fixtures (e.g. `"much-longer-wrong-key"` in `test_security.py`).
Both `.env.example` files ship with empty secret fields and include
generation instructions. `scripts/check_secrets.sh` (pre-push hook) scans for
known token formats (`ghp_`, `ghs_`, `github_pat_`, `AKIA`, OAuth tokens).

---

### INFO-3: Crawler SSRF mitigated by strict allow-list
**Severity:** Info
**Status:** No action needed

**Description.** The crawler's SSRF exposure is low because `validate_url`
restricts fetches to HTTPS-only and a fixed allow-list of three public CDNs.
An attacker cannot redirect the crawler to arbitrary internal URLs without
controlling GitHub's/GitCode's DNS. The fixes in MEDIUM-1/MEDIUM-2 add
defence-in-depth for the misconfiguration case.

---

### INFO-4: No ReDoS in parser regexes
**Severity:** Info
**Status:** No action needed

**Description.** `LINK_PATTERNS` use `(?<!\S)scheme://[^\s<>"\)]+` — a single
negated character class with no nested quantifiers, so no catastrophic
backtracking. `parse_proxy_api_response` uses anchored patterns
(`^(http|https|socks4|socks5)://`, `^((?:\d{1,3}\.){3}\d{1,3}):(\d{1,5})\s*$`)
that are linear in input length. No ReDoS risk found.

---

## Verification

```bash
cd /workspace/freenode
python3 -m py_compile scripts/utils.py scripts/parser.py scripts/verifier.py scripts/formatter.py   # OK
python3 -m ruff check scripts/utils.py scripts/parser.py scripts/verifier.py scripts/formatter.py \
    tests/test_security_hardening.py                                                                  # All checks passed
python3 -m pytest tests/test_security_hardening.py tests/test_utils.py tests/test_parser.py \
    tests/test_verifier.py -v                                                                         # 76 passed
```

All checks pass. The 8 new tests in `tests/test_security_hardening.py` cover
every fix; the 68 pre-existing tests across `test_utils` / `test_parser` /
`test_verifier` continue to pass unchanged, confirming backward compatibility.

---

## Recommendations (follow-up)

1. **Close the residual DNS-rebinding TOCTOU (MEDIUM-3).** Resolve once,
   validate, then connect to the IP literal with explicit SNI. Touches TLS
   and latency measurement — schedule as a focused follow-up.
2. **Add a production guard for missing `secret_key_hex` (MEDIUM-4).** Warn
   loudly (or fail-fast when `debug=False`) so plaintext storage is never
   silent.
3. **Centralise verifier concurrency / DNS resolution (LOW-1).** Reuse a
   single executor and a shared resolution helper to avoid per-call
   `ThreadPoolExecutor` churn.
4. **Defensive caps in `crawler.maybe_decode_base64` (LOW-3).** Mirror
   `MAX_B64_DECODE_LEN` once `crawler.py` is in scope.
5. **Control-character scrubbing in `to_proxy_list` (LOW-4).** Make the
   no-newline guarantee explicit rather than relying on the upstream regex.
6. **Consider an explicit allow-list normalisation for IDN (LOW-2)** if the
   source allow-list is ever opened to user-submitted domains.
7. **Keep `scripts/check_secrets.sh` current** — extend the pattern set as
   new source types are added.

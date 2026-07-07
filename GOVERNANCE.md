# Governance

This document describes how FreeNode is run, who decides what, and how decisions get made. It is short on purpose — the project is small and the goal is to keep things moving, not to add process for its own sake.

## Project status

FreeNode is a **community-curated aggregator** of public node and proxy lists. It is maintained by volunteers in their spare time. There is no company behind it and no SLA.

## Roles

### Maintainer

- Has push access to the main repository.
- Reviews and merges Pull Requests.
- Triages Issues and applies labels.
- Has the final say on what lands in `main`.

The current lead maintainer is **MS33834** (project founder).

### Contributors

- Anyone who opens an Issue, submits a PR, proposes a data source, or helps another user in Issues.
- No commit access. Influence comes from the quality of the contribution, not a title.

### Source submitters

A special case of contributor: people who propose new entries for `config/sources.json`. Their submissions follow the rules in [CONTRIBUTING.md](CONTRIBUTING.md) and are reviewed by a maintainer before being enabled.

## How decisions are made

1. **Small changes** (bug fixes, new sources, doc tweaks, dependency bumps): a maintainer reviews and merges. No vote needed.
2. **Larger changes** (new pipeline stages, output format changes, breaking config changes): open an Issue first with the `proposal` label. We discuss for at least 7 days. If there is no objection from a maintainer, the change can proceed.
3. **Disagreements**: the lead maintainer makes the call, but only after reading the discussion. Decisions and the reasoning behind them are recorded in the Issue or PR.

We prefer rough consensus over voting. If a vote is needed, a maintainer +1 in the thread is enough.

## What lands in `main`

A PR is merged when **all** of these are true:

- CI is green (`make check` passes locally too).
- The change matches the project scope — public node/proxy aggregation, not a general proxy framework.
- No secrets, no private/paid nodes, nothing that violates a source site's terms.
- For new sources: the entry is added with `enabled: false` first, then flipped on after a maintainer verifies it.

## Branch and release policy

- `main` is always releasable. Don't push broken code.
- Releases are cut by tagging `main` (e.g. `v1.2.5`). There is no separate release branch unless a backport is explicitly needed.
- The version number lives in `pyproject.toml` and `VERSION`. Both are bumped together.
- A GitHub Release is published for each tag, with a changelog summary.

## Data source policy

This is the heart of the project, so it gets its own section.

- **Public sources only**. No private, paid, cracked, or leaked nodes.
- **Respect the source**. If a site blocks automated fetching in `robots.txt` or ToS, we don't fetch it.
- **Attribution stays**. The source's name and URL are preserved in `config/sources.json`.
- **Removal on request**. If a source owner asks us to remove their entry, we do it within 7 days, no questions asked.
- **Health monitoring**. The `source-check` workflow opens Issues for sources that fail 3+ days in a row. After 14 days of failure with no fix, the maintainer may disable the source in `config/sources.json`.

## Security and disclosure

See [SECURITY.md](SECURITY.md). In short: report privately, we respond within 72 hours, fixed releases go out as soon as a patch is ready.

## Code of Conduct

Everyone participating in FreeNode — Issues, PRs, discussions — is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). It is enforced by the maintainer.

## Changes to this document

This governance model is intentionally minimal. If the project grows (multiple maintainers, a steering team, sub-projects), this file will be updated through the same proposal process described above. The lead maintainer can also update it directly for clarity without a formal proposal, as long as the spirit doesn't change.

---

Questions about how the project is run? Open a `governance` labeled Issue.

# Support

Thanks for using FreeNode. Please read this before asking for help — it helps us help you faster.

## Quick links

- **Landing page**: <https://ms33834.github.io/freenode/>
- **Docs site**: <https://ms33834.github.io/freenode/docs/>
- **GitHub Issues**: <https://github.com/MS33834/freenode/issues>
- **GitCode mirror**: <https://gitcode.com/badhope/freenode>

## Common questions

### A node won't connect

Free public nodes are short-lived and may die at any time. Try:

1. Wait for the next daily refresh (UTC 02:00).
2. Run `python3 scripts/update.py --verify` locally to get connectivity-checked nodes.
3. Switch protocols (Clash vs V2Ray) or try a different source.

### Subscription URL won't import

Check:

- The client supports the format you picked.
- The URL is reachable (GitHub Raw may need a mirror in some regions).
- Try the GitCode mirror URL instead.

### How do I add a new data source?

Use the [source report](https://github.com/MS33834/freenode/issues/new?template=source_report.md) template. Provide a public URL, protocol type, and update frequency.

## Reporting an issue

If the FAQ doesn't help, open a GitHub Issue and include:

1. Description and repro steps.
2. Environment (OS, client, browser).
3. Screenshots or logs of the error.
4. What you've already tried.

## Security vulnerabilities

Do not disclose security issues in public. Follow [SECURITY.md](SECURITY.md) for private reporting.

## Contributing

All forms of contribution are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

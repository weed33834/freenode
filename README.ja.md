# FreeNode

公開されている**無料プロキシ／ノード源の収集リポジトリ**です。自動パイプラインがコミュニティのソースからノードリストを取得・解析・検証・整形し、クライアントにそのまま読み込める購読ファイルを生成します。リポジトリは GitHub Actions によって毎日更新されます。サーバーもデータベースも不要です。

> **免責事項。** 本プロジェクトはネットワークプロトコルの学習、セキュリティテスト、プライバシー技術の研究を目的としたものです。すべてのノードは第三者の公開チャネル由来であり、当方はこれらを所有・運用せず、動作や安全性も保証しません。銀行・決済・重要なログインには絶対に使用しないでください。お住まいの地域の法律を守ってご利用ください。

## 目次

- [購読リンク](#購読リンク)
- [仕組み](#仕組み)
- [クイックスタート](#クイックスタート)
- [ツール](#ツール)
  - [update.py — パイプラインを実行](#updatepy--パイプラインを実行)
  - [discover_sources.py — 新しいソースを探す](#discover_sourcespy--新しいソースを探す)
  - [telegram_source.py — Telegram チャンネルを取得](#telegram_sourcepy--telegram-チャンネルを取得)
  - [crawler.py — 並行フェッチャー](#crawlerpy--並行フェッチャー)
  - [parser.py — リンク解析](#parserpy--リンク解析)
  - [verifier.py — 接続確認](#verifierpy--接続確認)
  - [dedup.py — 重複排除](#deduppy--重複排除)
  - [formatter.py — 出力整形](#formatterpy--出力整形)
  - [utils.py — 共通ヘルパー](#utilspy--共通ヘルパー)
- [設定](#設定)
  - [sources.json](#sourcesjson)
  - [環境変数](#環境変数)
- [出力ファイル](#出力ファイル)
- [毎日の自動更新](#毎日の自動更新)
- [開発](#開発)
- [ライセンス](#ライセンス)
- [他言語](#他言語)

## 購読リンク

いずれかをクライアントの購読欄（Clash / Clash Verge / Stash / v2rayN /
v2rayNG / Shadowrocket / Karing など）に貼り付けてください。ファイルは毎日の
ワークフローによって書き直されるため、手作業でコピーするより購読する方が
確実です。

| 形式 | 対応クライアント | リンク |
|---|---|---|
| Clash | Clash / Clash Verge / Stash | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml` |
| V2Ray | v2rayN / v2rayNG / Karing | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/v2ray.txt` |
| プロキシリスト | HTTP(S) / SOCKS4 / SOCKS5 クライアント | `https://raw.githubusercontent.com/MS33834/freenode/main/nodes/proxies.txt` |

公開ノードはすぐに失効します。リンクが死んでいるように見えても、自力で編集
せず次の毎日実行をお待ちください。

## 仕組み

パイプラインは、単一目的の小さなステップを一直線につなげたものです。各ステップ
は前のステップの出力を読み、次の出力を書きます。

```
config/sources.json
        │
        ▼
   crawler        すべての有効ソースを並行取得（httpx、ストリーミング）
        │
        ▼
   parser         生テキストからノード／プロキシ共有リンクを抽出
        │
        ▼
   dedup          コンテンツ指紋でミラーの重複を排除
        │
        ▼
   verifier  *(省略可)*   TCP ＋ 軽量プロトコルハンドシェイク
        │
        ▼
   formatter      clash.yaml / v2ray.txt / proxies.txt ＋ レポートを書き出し
        │
        ▼
   nodes/   毎日のワークフローがリポジトリへコミット
```

`update.py` が一連の処理を駆動します。その他のモジュールはこれから import
されます。通常呼ぶのは `update.py`（および補助ジョブの
`discover_sources.py` / `telegram_source.py`）のみです。

## クイックスタート

```bash
git clone https://github.com/MS33834/freenode.git
cd freenode
pip install -r requirements.txt

# 検証なしの高速実行
python scripts/update.py --no-verify

# 到達性を検証し、死んでいるノードを除外
python scripts/update.py --verify
```

結果は `nodes/` に出力されます（[出力ファイル](#出力ファイル) 参照）。

## ツール

すべてのスクリプトは `scripts/` にあります。そのうち 3 つが本物のコマンドライン
ツールで、残りは `update.py` が import するパイプラインモジュールです。

### update.py — パイプラインを実行

メインのエントリーポイントです。`config/sources.json` を読み込み、すべての有効
ソースをクロールしてリンクを抽出・重複排除し、必要に応じて検証し、すべての出力
ファイルを書き込むとともに、過去 14 日間のソース別信頼性レポートを更新します。

```bash
python scripts/update.py --verify      # 到達性を検証し、死ノードを除外
python scripts/update.py --no-verify   # 検証を省略（最速）
```

| フラグ | 意味 |
|---|---|
| `--verify` / `--no-verify` | 環境変数 `FREENODE_VERIFY_NODES` を上書きします。アウトバウンド通信がない環境（一部の CI ランナー等）では検証は自動的に省略されます。 |

終了コード：`0` 成功 · `2` 設定エラー · `3` 取得エラー · `4` 解析エラー。

内部的に行う順番：

1. `crawl()` — すべての有効ソースを一度に取得。
2. `extract_node_links()` / `parse_proxy_api_response()` — リンクを抽出。
3. `dedup_by_fingerprint()` — ミラーを除外。
4. `verify_nodes()` — 検証 ON のときのみ。
5. `write_outputs()` — 3 つの購読ファイル ＋ `quality.json` を書き込み。
6. `_write_source_report()` — 14 日間の信頼性スコアをロール更新。

### discover_sources.py — 新しいソースを探す

GitHub をスキャンして、無料ノード源っぽいリポジトリを探し、候補を
`nodes/discovered-sources.json` に `enabled: false` で書き出します。あなたが
レビューして `sources.json` に良いものをコピーするまで、何も本番投入されません。

```bash
GITHUB_TOKEN=ghp_xxx python scripts/discover_sources.py --min-stars 50
```

| フラグ | デフォルト | 意味 |
|---|---|---|
| `--query` | 内蔵キーワード | GitHub 検索クエリを上書き。 |
| `--min-stars` | `5` | リポジトリが必要な最小スター数。 |
| `--max-results` | `30` | 取得するリポジトリの最大数。 |
| `--output` | `nodes/discovered-sources.json` | 候補の書き出し先。 |

`GITHUB_TOKEN` を設定すると GitHub Search のレート制限が緩和されます。未設定だと
匿名制限にすぐ達します。

### telegram_source.py — Telegram チャンネルを取得

独立ツールです（メインパイプラインには接続されていません）。チャンネルの最近の
メッセージを読み、ノードリンクを抽出して JSON として出力します。
[Telethon](https://docs.telethon.dev/) と一度ログインしたセッションが必要です。

```bash
# まず一度ログイン（~/.freenode/freenode.session を作成）
python3 -m telethon_quickstart
# 取得する
python scripts/telegram_source.py @some_channel --limit 200 --output nodes/telegram.json
```

| フラグ | デフォルト | 意味 |
|---|---|---|
| `channel` *(位置引数)* | — | チャンネル名（`@xxx`）、`t.me/...` リンク、またはチャンネル ID。 |
| `--limit` | `100` | スキャンする最近のメッセージ数。 |
| `--session` | `freenode` | Telethon セッション名（`~/.freenode/` 配下に保存）。 |
| `--output` | 標準出力 | JSON 出力先。省略時は端末に出力。 |

### crawler.py — 並行フェッチャー

ライブラリモジュールです。`crawl()` は [httpx](https://www.python-httpx.org/)
で全有効ソースを並行オープンし、本文を `max_bytes` 上限付きでストリーミングし、
一時エラー時にリトライします。ファイル全体の Base64 を自動検出・デコードし、
過去 14 日間の信頼性スコアが `FREENODE_RELIABILITY_FLOOR` を下回るソースを除外
します。直接は実行せず、`update.py` から import されます。

主な関数：`crawl()`、`fetch_source()`、`fetch()`（リトライラッパー）、
`maybe_decode_base64()`、`_fetch_with_httpx()`（上限付きストリーミング）。

### parser.py — リンク解析

ライブラリモジュールです。生テキストやプロキシ API の応答を構造化されたノード
リンクに変換します。

- `extract_node_links()` — テキスト塊からすべての共有リンクを抽出。
- `parse_ss_link()` / `parse_trojan_link()` / `parse_vless_link()` /
  `parse_hysteria_link()` / `parse_hysteria2_link()` / `parse_tuic_link()` /
  `decode_vmess()` — プロトコル別パーサ。
- `parse_proxy_api_response()` — プロキシ API／リスト形式の応答に対応。
- `node_to_clash_config()` — リンクを Clash 設定エントリとして出力。

### verifier.py — 接続確認

ライブラリモジュールです。どのノードが実際に使えるかを判定します。

- `tcp_check()` — TCP 接続遅延（ミリ秒）。
- `verify_node_protocol()` — 2 段階チェック：TCP 接続、その後軽量なプロトコル
  レベルハンドシェイク。
- `verify_nodes()` — バッチで上記を実行。
- `stats_summary()` — 生存率、平均遅延、地域分布。
- `query_geo_api()` — 任意の地域判定（無料 IP geo API、24 時間キャッシュ）。
- `can_reach_public_internet()` — `update.py` がオフライン CI で検証を省略する
  ために使用。

### dedup.py — 重複排除

ライブラリモジュールです。ミラーソースは同じノードを異なる備考・エンコード・
順序でコピーします。`dedup_by_fingerprint()` は各ノードを
`(protocol, server, port, auth_secret)` でハッシュし、最初の出現のみを残すため、
ネットワークチェックに入る前に候補セット（および検証コスト）を大幅に削減します。

### formatter.py — 出力整形

ライブラリモジュールです。ファイルを書き出す唯一のモジュールです。

- `to_clash_yaml()` / `to_clash_yaml_by_protocol()` — Clash 購読。
- `to_v2ray_subscription()` — V2Ray／一般購読テキスト。
- `to_proxy_list()` — プレーンな `host:port` プロキシリスト。
- `to_quality_report()` — `nodes/quality.json` の日次スナップショット。
- `write_outputs()` — 上記すべて ＋ 地域グループのアトミック書き込み。

### utils.py — 共通ヘルパー

ライブラリモジュールです。パイプライン全体で使用されます。

- ログ：`setup_logging()`、`get_logger()`。
- Base64：`safe_b64decode()`、`_pad_base64()`、`decode_bytes()`（UTF-8 → GBK →
  latin-1 の順でフォールバック）。
- **SSRF 防御**：`validate_url()` は非 HTTPS／想定外ホストを拒否、`is_private_host()`
  と `allowed_hosts()` はプライベート・予約 IP をブロック。
- `load_sources()` — `sources.json` を読み込み最小検証。
- `protocol_of()` — リンクのプロトコルを判定（`hy2` → `hysteria2` に正規化）。

## 設定

### sources.json

`free_node_sources` 配列を持つ JSON オブジェクトです。各項目が 1 つの公開ソース
です。

```json
{
  "name": "example-source",
  "type": "github_raw",
  "url": "https://raw.githubusercontent.com/owner/repo/main/sub",
  "enabled": true,
  "decode_base64": true,
  "update_interval": "daily",
  "protocols": ["vmess", "vless", "ss", "trojan"],
  "note": "このソースについての説明。"
}
```

`type` は `github_raw` / `web_url` / `html` / `git_repo` / `rss` を指定できます。
`decode_base64` はファイル全体の Base64 デコード、`protocols` は残すリンク種別の
フィルタ、`enabled: false` はクロールせずファイルに残します。

### 環境変数

コードを編集せずにすべての挙動を調整できます。詳細は `.env.example` を参照。

| 変数 | デフォルト | 意味 |
|---|---|---|
| `FREENODE_LOG_LEVEL` | `INFO` | ログの詳細度。 |
| `FREENODE_VERIFY_NODES` | `true` | ノードの到達性を検証する。 |
| `FREENODE_VERIFY_TIMEOUT` | `5` | ノードごとの接続タイムアウト（秒）。 |
| `FREENODE_VERIFY_WORKERS` | `50` | 並行検証ワーカー数。 |
| `FREENODE_MAX_NODES` | `800` | 出力に残す最大ノード数。 |
| `FREENODE_MAX_PROXIES` | `300` | 出力に残す最大プロキシ数。 |
| `FREENODE_CRAWL_WORKERS` | _自動_ | 並行取得ワーカー数。 |
| `FREENODE_ALLOWED_HOSTS` | `raw.githubusercontent.com,gitcode.com,api.gitcode.com` | クローラーのホスト許可リスト（SSRF ガード）。 |
| `FREENODE_RELIABILITY_FLOOR` | _なし_ | この 14 日信頼性％を下回るソースを除外。 |
| `FREENODE_GEO_ENABLED` | `false` | 地域ごとにノードをグループ化（geo API 要）。 |

## 出力ファイル

すべて `nodes/` に書き出されます。

| ファイル | 目的 |
|---|---|
| `clash.yaml` | Clash 購読。 |
| `v2ray.txt` | V2Ray／一般購読。 |
| `proxies.txt` | プレーンな HTTP(S)/SOCKS プロキシリスト。 |
| `regions.json` | プロトコル／地域ごとにグループ化したノード。 |
| `quality.json` | 当日の品質スナップショット（総数、生存率、平均遅延、失敗理由）。 |
| `sources-report.json` | 過去 14 日間のソース別信頼性スコア。 |
| `discovered-sources.json` | `discover_sources.py` の候補（`enabled: false`）。 |

## 毎日の自動更新

`.github/workflows/update-nodes.yml` は毎日 02:00 UTC に
`python scripts/update.py --verify` を実行し、更新後の `nodes/` をコミットします。
リポジトリの **Actions** タブから手動で実行することもできます。

ランナーがアウトバウンドポートを遮断して検証がすべて失敗（出力が空）する場合は、
ワークフロー内の `--verify` を `--no-verify` に変更してください。

## 開発

```bash
make test    # tests/ スイートを実行
make lint    # ruff チェック
make update  # `python scripts/update.py` と同等
```

## ライセンス

[MIT ライセンス](LICENSE) の下で公開されています。利用・改変・再配布は自由ですが、
著作権表示を残してください。

## 他言語

- English: [README.md](README.md)
- 中文: [README.zh-CN.md](README.zh-CN.md)

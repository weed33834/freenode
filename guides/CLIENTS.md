# Client Setup Guides

How to subscribe to FreeNode's daily-updated proxy lists in the most
popular clients.

---

## Clash / Clash Verge / Clash.Meta

1. Open your client → **Profiles** (or **Subscriptions**).
2. Copy this URL:
   ```
   https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml
   ```
3. Paste into the subscription box → click **Import** / **Update**.
4. In the **Proxies** tab, select `PROXY` → choose a node.
5. (Optional) Set **Mode** to **Rule** (default) or **Global**.

Clients: [Clash Verge](https://github.com/clash-verge-rev/clash-verge-rev) ·
[Clash.Meta](https://github.com/MetaCubeX/Clash.Meta) ·
[Stash](https://stash.wiki) (iOS/macOS)

---

## v2rayN (Windows)

1. Download from [v2rayN releases](https://github.com/2dust/v2rayN/releases).
2. Click **Subscription** → **Subscription group setting**.
3. Fill in:
   - **Alias:** `FreeNode`
   - **URL:**
     ```
     https://raw.githubusercontent.com/MS33834/freenode/main/nodes/v2ray.txt
     ```
4. Click **OK** → **Subscription** → **Update subscription (keep local)**.
5. Select a server → right-click → **Set active server**.
6. Click **System proxy** (the rocket icon) to enable.

---

## v2rayNG (Android)

1. Install from [GitHub releases](https://github.com/2dust/v2rayNG/releases) or
   Google Play.
2. Tap `+` → **Import subscription**.
3. Paste the URL:
   ```
   https://raw.githubusercontent.com/MS33834/freenode/main/nodes/v2ray.txt
   ```
4. Tap the checkmark ✓ to confirm.
5. Select a node → tap the **V** icon (bottom-left) to connect.

---

## Shadowrocket (iOS)

1. Download from the App Store.
2. Tap the `+` icon in the top-right → **Subscribe**.
3. Set **URL:**
   ```
   https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml
   ```
4. Tap **Save** → the nodes appear in the list.
5. Tap the **Connect** toggle at the top.

---

## Stash (iOS / macOS)

1. Download from the App Store.
2. Tap **Profiles** → **New Profile** → **Subscribe**.
3. Paste:
   ```
   https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml
   ```
4. Tap **Download → Use**.
5. Go to **Dashboard** → toggle **Connected**.

---

## sing-box (Terminal / GUI)

1. Install via [sing-box releases](https://github.com/SagerNet/sing-box/releases).
2. Download the config:
   ```bash
   curl -O https://raw.githubusercontent.com/MS33834/freenode/main/nodes/clash.yaml
   ```
3. (sing-box 1.9+ supports Clash config directly — no conversion needed.)
4. Run:
   ```bash
   sing-box run -c clash.yaml
   ```

GUI frontends: [SFI](https://github.com/SagerNet/sing-box/releases) (iOS) ·
[Fusion](https://github.com/yijingping/sing-box-for-mac) (macOS)

---

## Proxychains (Linux / macOS)

1. Download the proxy list:
   ```bash
   curl -O https://raw.githubusercontent.com/MS33834/freenode/main/nodes/proxies.txt
   ```
2. Extract a proxy line (e.g., `http://1.2.3.4:8080`).
3. Edit `/etc/proxychains4.conf`:
   ```
   [ProxyList]
   http 1.2.3.4 8080
   ```
4. Run your command:
   ```bash
   proxychains4 curl https://example.com
   ```

---

## Tips

- **Auto-update:** Enable automatic subscription refresh in your client (most
  clients support this — every 6-24 hours is ideal).
- **Dead links:** If a subscription link doesn't work, wait for the next daily
  run (02:00 UTC) and try again.
- **CI runs:** FreeNode's pipeline fetches 84+ sources every day. The output
  files under `nodes/` are committed automatically.

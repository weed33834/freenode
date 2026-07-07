import fs from "fs";
import path from "path";
import { getSubscriptionUrl } from "@/lib/api";

const PROJECT_ROOT = path.join(process.cwd(), "..");
const CHANGELOG_PATH = path.join(PROJECT_ROOT, "CHANGELOG.md");

// 更新日志仍从仓库内的 CHANGELOG.md 读取，后端暂未提供对应接口
export interface ChangelogEntry {
  version: string;
  date: string;
  categories: Record<string, string[]>;
}

export function parseChangelog(): ChangelogEntry[] {
  if (!fs.existsSync(CHANGELOG_PATH)) return [];
  const text = fs.readFileSync(CHANGELOG_PATH, "utf-8");
  const entries: ChangelogEntry[] = [];

  const blocks = text.split(/\n(?=##\s+\[)/).filter((b) => /^##\s+\[/.test(b.trim()));

  for (const block of blocks) {
    const headerMatch = block.match(/^##\s+\[([^\]]+)\]\s+-\s+(\d{4}-\d{2}-\d{2})/);
    if (!headerMatch) continue;

    const [, version, date] = headerMatch;
    const categories: Record<string, string[]> = {};
    let currentCategory = "";

    for (const line of block.split("\n").slice(1)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("### ")) {
        currentCategory = trimmed.replace("### ", "").trim();
        categories[currentCategory] = categories[currentCategory] || [];
      } else if (trimmed.startsWith("- ") && currentCategory) {
        categories[currentCategory].push(trimmed.replace("- ", "").trim());
      }
    }

    entries.push({ version, date, categories });
  }

  return entries;
}

export function getLatestVersion(): string {
  const entries = parseChangelog();
  const first = entries[0];
  return first ? `v${first.version}` : "-";
}

// 保留旧的结构以兼容 tools 等页面，链接改为后端订阅接口
export function getSubscribeUrls() {
  return {
    clash: {
      github: getSubscriptionUrl("clash"),
      gitcode: getSubscriptionUrl("clash"),
    },
    v2ray: {
      github: getSubscriptionUrl("v2ray"),
      gitcode: getSubscriptionUrl("v2ray"),
    },
    proxies: {
      github: getSubscriptionUrl("plain"),
      gitcode: getSubscriptionUrl("plain"),
    },
  };
}

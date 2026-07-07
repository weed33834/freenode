export type NewsCategory = "project" | "protocol" | "security";

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  category: NewsCategory;
  summary: string;
  content: string;
}

export const categoryLabels: Record<NewsCategory | "all", string> = {
  all: "全部",
  project: "项目",
  protocol: "协议",
  security: "安全",
};

export const categoryStyles: Record<NewsCategory, string> = {
  project: "border-primary/30 text-primary bg-primary/10",
  protocol: "border-secondary/30 text-secondary bg-secondary/10",
  security: "border-warning/30 text-warning bg-warning/10",
};

export const news: NewsItem[] = [
  {
    id: "freenode-v2",
    title: "FreeNode 网站 2.0 改版上线",
    date: "2026-06-20",
    category: "project",
    summary: "响应式界面、数据源健康度看板与工具决策树，订阅与排查流程更顺畅。",
    content:
      "2.0 版重构了 Web 界面：新增数据源健康度卡片、失效源报告入口、命令行示例与工具选择决策树。页面加载速度提升，移动端布局适配改进。后续版本计划加入节点测速结果展示与多语言切换。",
  },
  {
    id: "hybrid-protocol",
    title: "混合协议订阅使用指南",
    date: "2026-06-18",
    category: "protocol",
    summary: "Clash、V2Ray 与 Base64 订阅的区别，以及如何根据客户端选择格式。",
    content:
      "Clash 订阅基于 YAML，支持规则分流，适合 Clash 系列客户端；V2Ray 订阅为 vmess/vless 链接集合，兼容 v2rayN、v2rayNG 等；Base64 订阅是通用格式，可被大多数客户端识别。FreeNode 同时提供三种输出，复制对应链接即可使用。",
  },
  {
    id: "public-node-risks",
    title: "公开节点的安全风险说明",
    date: "2026-06-15",
    category: "security",
    summary: "免费公开节点可能存在流量嗅探与中间人风险，仅适用于低敏感场景。",
    content:
      "公开节点由第三方维护，运营者可能查看、记录或篡改流量。仅适用于临时访问、学习研究或低敏感场景；涉及账号、支付、隐私数据时，应使用可信商业服务或自建节点。保持客户端与系统更新，避免使用来路不明的配置文件。",
  },
  {
    id: "source-verification",
    title: "数据源更新频率标注上线",
    date: "2026-06-10",
    category: "project",
    summary: "数据源页新增更新频率分布与「已标注更新源」指标，便于识别活跃源。",
    content:
      "config/sources.json 中每个数据源维护 update_interval 字段（5min / hourly / 12h / daily / inactive），用于标识更新频率。数据源页健康度卡片中「已标注更新源」基于该字段统计，同时提供更新频率分布图，方便判断哪些源持续活跃、哪些已低频或停滞。",
  },
  {
    id: "sing-box-intro",
    title: "sing-box 核心与客户端入门",
    date: "2026-06-05",
    category: "protocol",
    summary: "sing-box 作为新一代跨平台代理核心，正被越来越多客户端采用。",
    content:
      "sing-box 支持 VLESS、VMess、Trojan、Shadowsocks、Hysteria 2 等多种协议，提供统一的路由与 DNS 配置。NekoBox、Nekoray、Hiddify 等客户端均已内置 sing-box 内核。命令行用户也可直接使用 sing-box CLI 在服务器或本地运行。",
  },
  {
    id: "subscription-leak",
    title: "订阅链接泄露的防范措施",
    date: "2026-06-01",
    category: "security",
    summary: "订阅链接泄露后可能被滥用，不应分享到公共论坛或代码仓库。",
    content:
      "订阅链接包含大量节点信息，泄露后可能导致节点被滥用、IP 被封禁或被恶意抓取。仅在受信任的客户端中使用，不要粘贴到公共论坛、聊天群或代码仓库。若怀疑链接已泄露，可在 GitHub Issues 中联系维护者并考虑更换订阅地址。",
  },
];

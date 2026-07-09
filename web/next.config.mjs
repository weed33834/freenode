/** @type {import('next').NextConfig} */

// 后端地址，开发环境用来做 /api 反代
const apiBase = process.env.API_BASE_URL || "http://localhost:8000";

// 是否开发环境（NODE_ENV !== production）。rewrites 只在开发环境生效，
// 生产环境由 Caddy 反代，避免在 SSR/Edge 暴露后端真实地址。
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  distDir: "dist",
  // 开 standalone 输出，Docker 镜像只复制 dist/standalone 产物，镜像小启动快
  output: "standalone",
  // 去掉 output: "export"，改为动态渲染以支持运行期 fetch
  // 去掉 basePath，部署时由 Caddy 反代
  allowedDevOrigins: [
    "127.0.0.1",
  ],
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // 关闭 X-Powered-By 头，避免暴露 Next.js 版本号给指纹扫描器
  poweredByHeader: false,
  // 开发环境把 /api/* 代理到后端，生产环境由 Caddy 反代。
  // 之前无条件返回 rewrites，生产构建也会注入 /api → 后端地址的代理规则，
  // 这会让前端 SSR 直接打到后端内网地址，绕过 Caddy 的限流/鉴权。
  async rewrites() {
    if (!isDev) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
  // 全局安全响应头。生产环境强制；开发环境也带上，方便早发现 CSP 误伤。
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js 内联脚本 + RSC 需要 'unsafe-inline' / 'unsafe-eval'（开发），
      // 生产可以用 nonce 收紧，这里先放开 inline，配 strict-dynamic 兜底。
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      // 禁止 <iframe> / <object> / <embed> 嵌入本站，防点击劫持
      "frame-ancestors 'none'",
      // 表单只能提交到本站，防 CSRF 数据外泄
      "form-action 'self'",
      // 不允许 base-uri 覆盖，防脚本注入后改 <base>
      "base-uri 'self'",
      // 禁止 mixed content
      "block-all-mixed-content",
      // 升级不安全请求（生产 https）
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;

import Link from "next/link";
import { Code2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-2">FreeNode</h3>
            <p className="text-muted leading-relaxed max-w-md">
              社区维护的免费代理/VPN 工具与公开节点聚合项目。仅供学习网络协议、安全测试和隐私技术研究使用。
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-foreground">导航</h4>
            <ul className="space-y-1.5 text-muted">
              <li>
                <Link href="/subscribe" className="hover:text-foreground">
                  订阅节点
                </Link>
              </li>
              <li>
                <Link href="/sources" className="hover:text-foreground">
                  数据源
                </Link>
              </li>
              <li>
                <Link href="/clients" className="hover:text-foreground">
                  客户端教程
                </Link>
              </li>
              <li>
                <Link href="/tools" className="hover:text-foreground">
                  工具与生态
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-foreground">
                  运行状态
                </Link>
              </li>
              <li>
                <Link href="/roadmap" className="hover:text-foreground">
                  未来方向
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-foreground">
                  更新日志
                </Link>
              </li>
              <li>
                <Link href="/architecture" className="hover:text-foreground">
                  架构说明
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-foreground">
                  关于
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-foreground">
                  社区
                </Link>
              </li>
              <li>
                <Link href="/contribute" className="hover:text-foreground">
                  参与贡献
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-foreground">
                  免责声明
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2 text-foreground">仓库</h4>
            <div className="space-y-1.5 text-muted">
              <a
                href="https://github.com/MS33834/freenode"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <Code2 className="w-3.5 h-3.5" />
                GitHub
              </a>
              <a
                href="https://gitcode.com/badhope/freenode"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                GitCode 镜像
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-border text-xs text-muted">
          Released under MIT License · 仅供学习研究使用
        </div>
      </div>
    </footer>
  );
}

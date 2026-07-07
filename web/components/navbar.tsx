"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Code2, Globe } from "lucide-react";

const navItems = [
  { label: "首页", href: "/" },
  { label: "节点", href: "/nodes" },
  { label: "订阅", href: "/subscribe" },
  { label: "自定义订阅", href: "/subscribe/custom" },
  { label: "数据源", href: "/sources" },
  { label: "平台", href: "/platforms" },
  { label: "动态", href: "/news" },
  { label: "客户端", href: "/clients" },
  { label: "工具", href: "/tools" },
  { label: "状态", href: "/status" },
  { label: "未来方向", href: "/roadmap" },
  { label: "更新日志", href: "/changelog" },
  { label: "架构", href: "/architecture" },
  { label: "关于", href: "/about" },
  { label: "社区", href: "/community" },
  { label: "贡献", href: "/contribute" },
  { label: "免责声明", href: "/disclaimer" },
  { label: "仪表盘", href: "/dashboard" },
  { label: "管理", href: "/admin" },
];

// Docs are served by the separate VitePress site, not a Next.js route.
const docsHref = process.env.NEXT_PUBLIC_DOCS_URL || "https://ms33834.github.io/freenode/";

const mobileMenuId = "mobile-menu";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <Globe className="w-5 h-5 text-primary" />
          <span>FreeNode</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "text-foreground border-b border-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href={docsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            文档
          </a>
          <a
            href="https://github.com/MS33834/freenode"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 p-1.5 text-muted hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <Code2 className="w-4 h-4" />
          </a>
        </nav>

        <button
          type="button"
          className="md:hidden p-1.5 hover:bg-surface-hover"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls={mobileMenuId}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div
          ref={menuRef}
          id={mobileMenuId}
          className="md:hidden border-t border-border px-4 py-2 space-y-1 animate-fade-in"
        >
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`block px-3 py-2 text-sm ${
                  active
                    ? "text-foreground bg-surface"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <a
            href={docsHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-hover"
          >
            文档
          </a>
        </div>
      )}
    </header>
  );
}

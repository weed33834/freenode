import Link from "next/link";
import { Home, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-14 h-14 border border-border bg-surface text-primary mb-6">
          <Compass className="w-7 h-7" />
        </div>
        <p className="text-5xl font-semibold font-mono text-primary mb-3">404</p>
        <h1 className="text-xl font-semibold mb-2">页面未找到</h1>
        <p className="text-sm text-muted leading-relaxed mb-8">
          你访问的页面不存在或已被移动。请检查链接是否正确，或返回首页继续浏览。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <Home className="w-4 h-4" />
          返回首页
        </Link>
      </div>
    </div>
  );
}

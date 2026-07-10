"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { setAdminKey } from "@/lib/auth-store";

/**
 * 管理后台登录表单。admin 和 dashboard 页共用。
 * Key 只存本机浏览器，不上传。
 */
export function AdminLogin({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const [keyInput, setKeyInput] = useState("");

  const handleLogin = () => {
    const key = keyInput.trim();
    if (!key) return;
    setAdminKey(key);
    setKeyInput("");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-sm text-muted mb-6">{description}</p>
      <div className="border border-border bg-surface p-5 space-y-3">
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="输入管理 API Key"
          aria-label="管理 API Key"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleLogin}
            disabled={!keyInput.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LogIn className="w-4 h-4" /> 登录
          </button>
          <button
            type="button"
            onClick={() => setKeyInput("")}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

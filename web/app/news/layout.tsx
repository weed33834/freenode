import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "动态 — FreeNode",
  description:
    "FreeNode 的项目进展、协议科普与安全建议，帮助你更好地使用公开代理资源。",
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

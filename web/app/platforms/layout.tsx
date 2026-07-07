import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "平台索引 — FreeNode",
  description:
    "收集 GitHub 上知名的 VPN / 代理节点分享仓库，提供简介、协议与输出格式信息，可按协议、格式与难度筛选订阅源。",
};

export default function PlatformsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

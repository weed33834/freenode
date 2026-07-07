import type { Metadata } from "next";
import { fetchNodes, fetchFilters } from "@/lib/api";
import { NodesExplorer } from "@/components/nodes-explorer";

export const metadata: Metadata = {
  title: "节点浏览 — FreeNode",
  description:
    "按协议、地区、关键词浏览 FreeNode 当前收录的节点，支持分页与可用性筛选。",
};

export default async function NodesPage() {
  // 服务端拿首屏数据：前 20 个节点 + 筛选选项（带计数）
  const [initial, filters] = await Promise.all([
    fetchNodes({ limit: 20, offset: 0, sort: "updated" }),
    fetchFilters(),
  ]);

  const protocols = filters?.protocols.map((p) => p.value) ?? [];
  const regions = filters?.regions.map((r) => r.value) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">节点浏览</h1>
        <p className="text-sm text-muted max-w-2xl">
          浏览当前收录的全部节点，支持按协议、地区筛选与关键词搜索。数据由后端实时返回，可用性受网络环境影响。
        </p>
      </div>

      <NodesExplorer
        initialNodes={initial.items}
        initialTotal={initial.total}
        protocols={protocols}
        regions={regions}
      />
    </div>
  );
}

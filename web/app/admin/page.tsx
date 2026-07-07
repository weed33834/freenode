"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Power,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
} from "lucide-react";
import {
  fetchNodes,
  fetchSources,
  fetchFilters,
  type Node,
  type NodeQuery,
  type Source,
} from "@/lib/api";
import {
  isAuthed,
  setAdminKey,
  triggerRefresh,
  getTaskStatus,
  deleteNode,
  updateSource,
  createSource,
  deleteSource,
  type TaskStatus,
} from "@/lib/admin-api";
import { SourceForm, type SourceFormValues } from "@/components/source-form";

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 60;

// 用外部 store 订阅登录态：避免在 effect 里同步 setState，也避开 hydration 不一致
const authListeners = new Set<() => void>();

function notifyAuthChange() {
  authListeners.forEach((l) => l());
}

function subscribeAuth(cb: () => void): () => void {
  authListeners.add(cb);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", cb);
  }
  return () => {
    authListeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", cb);
    }
  };
}

function getAuthedSnapshot(): boolean {
  return isAuthed();
}

function getAuthedServerSnapshot(): boolean {
  return false;
}

export default function AdminPage() {
  const authed = useSyncExternalStore(
    subscribeAuth,
    getAuthedSnapshot,
    getAuthedServerSnapshot
  );
  const [keyInput, setKeyInput] = useState("");

  const handleLogin = () => {
    const key = keyInput.trim();
    if (!key) return;
    setAdminKey(key);
    notifyAuthChange();
    setKeyInput("");
  };

  const handleLogout = () => {
    setAdminKey("");
    notifyAuthChange();
  };

  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-semibold mb-2">管理后台</h1>
        <p className="text-sm text-muted mb-6">
          输入管理 API Key 登录。Key 只存在本机浏览器，不会上传。
        </p>
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-1">管理后台</h1>
          <p className="text-sm text-muted">已登录，请求只走同源，Key 存在本机。</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" /> 退出
        </button>
      </div>

      <RefreshPanel />
      <NodesPanel />
      <SourcesPanel />
    </div>
  );
}

function RefreshPanel() {
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startRefresh = async (verify: boolean) => {
    setError(null);
    setTask(null);
    setBusy(true);
    try {
      const res = await triggerRefresh(verify);
      setTask({ task_id: res.task_id, status: "running" });
      setRunningTaskId(res.task_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!runningTaskId) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const status = await getTaskStatus(runningTaskId);
        if (cancelled) return;
        setTask(status);
        if (status.status !== "running") {
          setBusy(false);
          return;
        }
        if (attempts >= POLL_MAX_ATTEMPTS) {
          setError("轮询超时，任务可能仍在后台运行，稍后重试或查看后端日志。");
          setBusy(false);
          return;
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setBusy(false);
      }
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runningTaskId]);

  return (
    <section className="border border-border bg-surface p-5 mb-6">
      <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <RefreshCw className={`w-4 h-4 text-primary ${busy ? "animate-spin" : ""}`} />
        流水线刷新
      </h2>
      <p className="text-xs text-muted mb-4">
        触发后台抓取与验证流水线。验证模式会逐个测节点，耗时较长；不验证只抓取入库。
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => startRefresh(true)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background text-xs font-medium hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          立即刷新（验证）
        </button>
        <button
          type="button"
          onClick={() => startRefresh(false)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          立即刷新（不验证）
        </button>
      </div>

      {busy && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          刷新中...
        </div>
      )}

      {!busy && task && task.status === "completed" && (
        <div className="border border-success/30 bg-success/10 p-3 text-sm">
          <div className="flex items-center gap-2 text-success font-medium mb-1">
            <CheckCircle className="w-4 h-4" /> 刷新完成
          </div>
          <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
            {task.node_sources != null && <span>节点源数：{task.node_sources}</span>}
            {task.alive_nodes != null && <span>存活节点：{task.alive_nodes}</span>}
            {task.upserted != null && <span>入库：{task.upserted}</span>}
            {task.total_links != null && <span>总链接：{task.total_links}</span>}
            {task.elapsed_seconds != null && (
              <span>耗时：{task.elapsed_seconds} 秒</span>
            )}
          </div>
        </div>
      )}

      {!busy && task && task.status === "failed" && (
        <div className="border border-danger/30 bg-danger/10 p-3 text-sm">
          <div className="flex items-center gap-2 text-danger font-medium mb-1">
            <XCircle className="w-4 h-4" /> 刷新失败
          </div>
          <div className="text-xs text-muted">{task.error || "未知错误"}</div>
        </div>
      )}

      {error && (
        <div className="border border-danger/30 bg-danger/10 p-3 text-xs text-danger mt-3">
          {error}
        </div>
      )}
    </section>
  );
}

function NodesPanel() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [protocol, setProtocol] = useState("");
  const [aliveOnly, setAliveOnly] = useState(false);
  const [protocols, setProtocols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchFilters().then((f) => {
      if (f) setProtocols(f.protocols.map((p) => p.value));
    });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    const params: NodeQuery = { limit: PAGE_SIZE, offset, sort: "updated" };
    if (protocol) params.protocol = protocol;
    if (aliveOnly) params.alive = true;
    const res = await fetchNodes(params);
    setNodes(res.items);
    setTotal(res.total);
    setLoading(false);
  }, [offset, protocol, aliveOnly]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`确定删除节点 #${id}？删除后不可恢复。`)) return;
    setDeletingId(id);
    try {
      await deleteNode(id);
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <section className="border border-border bg-surface mb-6">
      <div className="px-4 py-3 border-b border-border flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-sm">节点管理</h2>
          <span className="text-xs text-muted ml-auto font-mono">共 {total} 个</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={protocol}
            onChange={(e) => {
              setProtocol(e.target.value);
              setOffset(0);
            }}
            aria-label="按协议筛选"
            className="border border-border bg-background px-2.5 py-1.5 text-xs text-muted focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="">所有协议</option>
            {protocols.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-pressed={aliveOnly}
            onClick={() => {
              setAliveOnly((v) => !v);
              setOffset(0);
            }}
            className={`px-3 py-1.5 text-xs border transition-colors ${
              aliveOnly
                ? "border-success/30 text-success bg-success/10"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            仅看可用
          </button>
        </div>
      </div>

      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        )}
        <table className="w-full text-xs text-left">
          <thead className="bg-background text-muted border-b border-border">
            <tr>
              <th className="px-4 py-2.5 font-medium">协议</th>
              <th className="px-4 py-2.5 font-medium">备注</th>
              <th className="px-4 py-2.5 font-medium">地区</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
              <th className="px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {nodes.map((node) => (
              <tr key={node.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted uppercase">
                    {node.protocol}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="truncate max-w-xs" title={node.remark}>
                    {node.remark || "—"}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-muted uppercase">
                  {node.region || "—"}
                </td>
                <td className="px-4 py-2.5">
                  {node.is_alive ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium px-1.5 py-0.5 border border-success/20">
                      可用
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted text-xs font-medium px-1.5 py-0.5 border border-border">
                      失效
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => handleDelete(node.id)}
                    disabled={deletingId === node.id}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-danger/30 text-danger hover:bg-danger/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deletingId === node.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {nodes.length === 0 && !loading && (
          <div className="p-6 text-center text-muted text-xs">没有符合条件的节点</div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-3">
        <span className="text-xs text-muted font-mono">
          第 {currentPage} / {pageCount} 页
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={!canPrev}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> 上一页
          </button>
          <button
            type="button"
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!canNext}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下一页 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function SourcesPanel() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const list = await fetchSources();
    setSources(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleToggle = async (source: Source) => {
    setTogglingId(source.id);
    try {
      const updated = await updateSource(source.id, {
        enabled: !source.enabled,
      });
      setSources((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async (values: SourceFormValues) => {
    setSubmitting(true);
    try {
      await createSource(values);
      await reload();
      setShowCreateForm(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: SourceFormValues) => {
    if (!editingSource) return;
    setSubmitting(true);
    try {
      // updateSource 不接 source_type，单独剔掉
      await updateSource(editingSource.id, {
        name: values.name,
        url: values.url,
        category: values.category,
        enabled: values.enabled,
        decode_base64: values.decode_base64,
        proxy_scheme: values.proxy_scheme,
      });
      await reload();
      setEditingSource(null);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (source: Source) => {
    const ok = window.confirm(
      `确定删除数据源 "${source.name}"？删除后不可恢复。`
    );
    if (!ok) return;
    setDeletingId(source.id);
    try {
      await deleteSource(source.id);
      await reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  };

  const startCreate = () => {
    setEditingSource(null);
    setShowCreateForm(true);
  };

  const startEdit = (source: Source) => {
    setShowCreateForm(false);
    setEditingSource(source);
  };

  const formOpen = showCreateForm || editingSource !== null;

  return (
    <section className="border border-border bg-surface">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <h2 className="font-medium text-sm">数据源管理</h2>
        <button
          type="button"
          onClick={startCreate}
          disabled={formOpen}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" /> 新增数据源
        </button>
        <span className="text-xs text-muted ml-auto font-mono">
          共 {sources.length} 个
        </span>
      </div>

      {showCreateForm && (
        <div className="p-4 border-b border-border">
          <SourceForm
            submitting={submitting}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {editingSource && (
        <div className="p-4 border-b border-border">
          <SourceForm
            key={editingSource.id}
            initial={{
              name: editingSource.name,
              url: editingSource.url,
              category: editingSource.category,
              source_type: editingSource.source_type,
              enabled: editingSource.enabled,
              decode_base64: editingSource.decode_base64,
              proxy_scheme: editingSource.proxy_scheme,
            }}
            submitting={submitting}
            onSubmit={handleEdit}
            onCancel={() => setEditingSource(null)}
          />
        </div>
      )}

      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
        )}
        <table className="w-full text-xs text-left">
          <thead className="bg-background text-muted border-b border-border">
            <tr>
              <th className="px-4 py-2.5 font-medium">名称</th>
              <th className="px-4 py-2.5 font-medium">类别</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
              <th className="px-4 py-2.5 font-medium">最后抓取</th>
              <th className="px-4 py-2.5 font-medium">连续失败</th>
              <th className="px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sources.map((source) => (
              <tr key={source.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-4 py-2.5 font-medium">
                  <div className="truncate max-w-[180px]" title={source.name}>
                    {source.name}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border text-muted">
                    {source.category || source.source_type || "—"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {source.enabled ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium px-1.5 py-0.5 border border-success/20">
                      启用
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted text-xs font-medium px-1.5 py-0.5 border border-border">
                      禁用
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted">
                  {source.last_fetch_at
                    ? new Date(source.last_fetch_at).toLocaleString("zh-CN")
                    : "从未"}
                </td>
                <td className="px-4 py-2.5 font-mono">
                  {source.consecutive_failures > 0 ? (
                    <span className="text-warning">{source.consecutive_failures}</span>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="编辑"
                      onClick={() => startEdit(source)}
                      disabled={formOpen}
                      className="inline-flex items-center justify-center w-7 h-7 text-xs border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(source)}
                      disabled={togglingId === source.id}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        source.enabled
                          ? "border-warning/30 text-warning hover:bg-warning/10"
                          : "border-success/30 text-success hover:bg-success/10"
                      }`}
                    >
                      {togglingId === source.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Power className="w-3 h-3" />
                      )}
                      {source.enabled ? "禁用" : "启用"}
                    </button>
                    <button
                      type="button"
                      aria-label="删除"
                      onClick={() => handleDelete(source)}
                      disabled={deletingId === source.id}
                      className="inline-flex items-center justify-center w-7 h-7 text-xs border border-danger/30 text-danger hover:bg-danger/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deletingId === source.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sources.length === 0 && !loading && (
          <div className="p-6 text-center text-muted text-xs">暂无数据源</div>
        )}
      </div>
    </section>
  );
}

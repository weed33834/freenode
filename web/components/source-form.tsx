"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

export interface SourceFormValues {
  name: string;
  url: string;
  category: string;
  source_type: string;
  enabled: boolean;
  decode_base64: boolean;
  proxy_scheme: string;
}

const CATEGORIES = ["free_node_sources", "free_proxy_apis"];
const SOURCE_TYPES = ["node", "proxy"];
const PROXY_SCHEMES = ["http", "https", "socks4", "socks5"];

const DEFAULTS: SourceFormValues = {
  name: "",
  url: "",
  category: "free_node_sources",
  source_type: "node",
  enabled: true,
  decode_base64: false,
  proxy_scheme: "http",
};

export function SourceForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<SourceFormValues>;
  submitting: boolean;
  onSubmit: (values: SourceFormValues) => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;
  const [values, setValues] = useState<SourceFormValues>({
    ...DEFAULTS,
    ...initial,
  });

  // proxy_scheme 仅 source_type=proxy 时才用得上
  const proxySchemeDisabled = values.source_type !== "proxy";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const inputCls =
    "w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/40";
  const labelCls = "block text-xs text-muted mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="source-name">
            名称 *
          </label>
          <input
            id="source-name"
            type="text"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="source-url">
            URL *
          </label>
          <input
            id="source-url"
            type="text"
            value={values.url}
            onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="source-category">
            类别
          </label>
          <select
            id="source-category"
            value={values.category}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
            className={inputCls}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="source-type">
            类型
          </label>
          <select
            id="source-type"
            value={values.source_type}
            onChange={(e) =>
              setValues((v) => ({ ...v, source_type: e.target.value }))
            }
            className={inputCls}
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="source-proxy-scheme">
            代理协议
          </label>
          <select
            id="source-proxy-scheme"
            value={values.proxy_scheme}
            onChange={(e) =>
              setValues((v) => ({ ...v, proxy_scheme: e.target.value }))
            }
            disabled={proxySchemeDisabled}
            className={`${inputCls} ${proxySchemeDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {PROXY_SCHEMES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2 pb-1">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) =>
                setValues((v) => ({ ...v, enabled: e.target.checked }))
              }
              className="accent-primary"
            />
            启用
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={values.decode_base64}
              onChange={(e) =>
                setValues((v) => ({ ...v, decode_base64: e.target.checked }))
              }
              className="accent-primary"
            />
            Base64 解码
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-background text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "保存" : "创建"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          取消
        </button>
      </div>
    </form>
  );
}

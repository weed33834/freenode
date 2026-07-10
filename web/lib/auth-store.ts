// 管理后台与仪表盘共用的登录态外部 store
// Key 只存 localStorage，请求带 X-API-Key（见 admin-api.ts），只走同源
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "freenode_admin_key";
const authListeners = new Set<() => void>();

export function notifyAuthChange() {
  authListeners.forEach((l) => l());
}

export function subscribeAuth(listener: () => void) {
  authListeners.add(listener);
  const storageListener = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", storageListener);
  return () => {
    authListeners.delete(listener);
    window.removeEventListener("storage", storageListener);
  };
}

export function getAuthedSnapshot(): boolean {
  return typeof window !== "undefined" && !!localStorage.getItem(STORAGE_KEY);
}

// 读取当前 Key，供 admin-api.ts 拼 X-API-Key 用，避免在两处各自维护 storage key
export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function getAuthedServerSnapshot(): boolean {
  return false;
}

export function useAuth() {
  return useSyncExternalStore(subscribeAuth, getAuthedSnapshot, getAuthedServerSnapshot);
}

export function setAdminKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
  notifyAuthChange();
}

export function clearAdminKey() {
  localStorage.removeItem(STORAGE_KEY);
  notifyAuthChange();
}

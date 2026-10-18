import { useEffect, useState } from 'react';

type ToastType = 'info' | 'success' | 'error';
interface ToastItem {
  id: number;
  type: ToastType;
  msg: string;
}

let nextId = 1;
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];

function emit() {
  listeners.forEach((l) => l(items));
}

export const toast = {
  info: (msg: string) => push('info', msg),
  success: (msg: string) => push('success', msg),
  error: (msg: string) => push('error', msg),
};

function push(type: ToastType, msg: string) {
  const id = nextId++;
  items = [...items, { id, type, msg }];
  emit();
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, 2500);
}

export default function ToastContainer() {
  const [list, setList] = useState<ToastItem[]>([]);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  if (list.length === 0) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {list.map((it) => (
        <div
          key={it.id}
          className={`rounded-xl px-4 py-2 text-sm font-medium text-white shadow-pop pointer-events-auto ${
            it.type === 'error' ? 'bg-down' : it.type === 'success' ? 'bg-up' : 'bg-text'
          }`}
        >
          {it.msg}
        </div>
      ))}
    </div>
  );
}

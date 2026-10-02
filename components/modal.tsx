'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  return <dialog ref={ref} className="modal" onCancel={close}><div className="dialoghead"><h2 tabIndex={-1} autoFocus>{title}</h2><button className="iconbtn" onClick={close} aria-label="Chiudi"><X /></button></div><div className="body">{children}</div></dialog>;
}

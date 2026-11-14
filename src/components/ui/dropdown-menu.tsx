"use client";

import * as React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { menuPosition } from '@/lib/utils/menu-position';

export interface DropdownMenuItem {
  label: string; href?: string; onClick?: () => void; icon?: React.ReactNode; isDestructive?: boolean;
}
export interface DropdownMenuProps {
  trigger: React.ReactNode; items: DropdownMenuItem[]; align?: 'left' | 'right'; header?: React.ReactNode; className?: string; triggerLabel?: string;
}
export function DropdownMenu({ trigger, items, align = 'right', header, className, triggerLabel = 'Open account menu' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const [position, setPosition] = React.useState<ReturnType<typeof menuPosition> | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLElement | null)[]>([]);
  const reduceMotion = useReducedMotion();
  const id = React.useId();
  const focusOnOpen = React.useRef(false);

  React.useLayoutEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (!triggerRef.current || !menuRef.current) return;
      const viewport = window.visualViewport;
      const next = menuPosition(triggerRef.current.getBoundingClientRect(), {
        width: viewport?.width ?? document.documentElement.clientWidth,
        height: viewport?.height ?? window.innerHeight,
        left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0,
      }, menuRef.current.scrollHeight, align);
      setPosition(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    reposition();
    const observer = new ResizeObserver(reposition);
    if (menuRef.current) observer.observe(menuRef.current);
    if (triggerRef.current) observer.observe(triggerRef.current);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      observer.disconnect(); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
      document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape);
    };
  }, [isOpen, align]);

  React.useLayoutEffect(() => {
    if (isOpen && position && focusOnOpen.current) {
      itemRefs.current[0]?.focus({ preventScroll: true });
      focusOnOpen.current = false;
    }
  }, [isOpen, position]);

  function keyDown(event: React.KeyboardEvent) {
    let index = focusedIndex;
    if (event.key === 'ArrowDown') index = (index + 1) % items.length;
    else if (event.key === 'ArrowUp') index = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = items.length - 1;
    else if (event.key === 'Tab') {
      event.preventDefault();
      const focusable = Array.from(document.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]')).filter(element => !menuRef.current?.contains(element) && element.getClientRects().length);
      const triggerIndex = focusable.indexOf(triggerRef.current!);
      setIsOpen(false); focusable[triggerIndex + (event.shiftKey ? -1 : 1)]?.focus(); return;
    } else return;
    event.preventDefault(); setFocusedIndex(index); itemRefs.current[index]?.focus();
  }
  const itemClass = 'flex w-full min-h-11 items-center gap-3 px-4 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--paper-tint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand)]';
  return <div className={cn('relative inline-block shrink-0', className)}>
    <button type="button" ref={triggerRef} aria-label={triggerLabel} aria-haspopup="menu" aria-expanded={isOpen} aria-controls={isOpen ? id : undefined} onClick={() => { focusOnOpen.current = !isOpen; setIsOpen(!isOpen); setFocusedIndex(0); setPosition(null); }} className="flex min-h-11 min-w-11 items-center justify-center gap-2">{trigger}</button>
    {typeof document !== 'undefined' && createPortal(<AnimatePresence>{isOpen && <motion.div
      id={id} ref={menuRef} role="menu" aria-label="Account options" onKeyDown={keyDown}
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: reduceMotion ? 0 : 0.12 }}
      style={{ ...position, visibility: position ? 'visible' : 'hidden' }}
      className="fixed z-[100] overflow-y-auto overflow-x-hidden rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-md)]"
    >
      {header && <div className="min-w-0 break-words border-b border-[var(--foil-soft)] bg-[var(--mint-soft)] px-4 py-3 [overflow-wrap:anywhere]">{header}</div>}
      <div className="py-2">{items.map((item, index) => {
        const content = <>{item.icon && <span className="h-4 w-4 shrink-0" aria-hidden="true">{item.icon}</span>}<span>{item.label}</span></>;
        const props = { role: 'menuitem', tabIndex: index === focusedIndex ? 0 : -1, onFocus: () => setFocusedIndex(index), className: itemClass, ref: (element: HTMLElement | null) => { itemRefs.current[index] = element; } };
        return item.href ? <Link key={index} {...props} href={item.href} onClick={() => setIsOpen(false)}>{content}</Link> : <button key={index} {...props} type="button" onClick={() => { item.onClick?.(); setIsOpen(false); triggerRef.current?.focus(); }}>{content}</button>;
      })}</div>
    </motion.div>}</AnimatePresence>, document.body)}
  </div>;
}

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserProfileCard } from './user-profile-card';
import { useUserProfileCard } from '@/shared/hooks/use-user-profile-card';

interface UserProfileCardTriggerProps {
  userId: string;
  children: React.ReactNode;
  /** ms before card opens on hover (default 350) */
  hoverDelay?: number;
  profileHref?: string;
  cardChildren?: React.ReactNode;
}

export function UserProfileCardTrigger({
  userId,
  children,
  hoverDelay = 350,
  profileHref,
  cardChildren,
}: UserProfileCardTriggerProps) {
  const [open, setOpen]     = useState(false);
  const [pos, setPos]       = useState({ top: 0, left: 0 });
  const [fetchId, setFetch] = useState<string | null>(null);

  const triggerRef  = useRef<HTMLSpanElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  // Single shared timer used for BOTH open-delay AND close-delay.
  // This is the key: cancelling it from either side prevents race conditions.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, error } = useUserProfileCard(fetchId);

  // ── Position (position:fixed — viewport-relative, no scroll offsets) ──────

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const card    = cardRef.current;
    if (!trigger) return;

    const rect  = trigger.getBoundingClientRect();
    const cardW = card?.offsetWidth  || 288;
    const cardH = card?.offsetHeight || 360;
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    const GAP   = 8;
    const EDGE  = 6;

    let left = rect.right + GAP;
    if (left + cardW > vw - EDGE) left = rect.left - GAP - cardW;
    left = Math.max(EDGE, Math.min(left, vw - cardW - EDGE));

    let top = rect.top;
    if (top + cardH > vh - EDGE) top = vh - EDGE - cardH;
    top = Math.max(EDGE, top);

    setPos({ top, left });
  }, []);

  // Reposition once after open, and whenever card resizes (skeleton → data)
  useEffect(() => {
    if (!open) return;
    computePosition();
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (!card) return;
    const ro = new ResizeObserver(computePosition);
    ro.observe(card);
    return () => ro.disconnect();
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', computePosition, true);
    window.addEventListener('resize', computePosition);
    return () => {
      window.removeEventListener('scroll', computePosition, true);
      window.removeEventListener('resize', computePosition);
    };
  }, [open, computePosition]);

  // ── Open / close helpers ──────────────────────────────────────────────────

  const clearTimer = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };

  const scheduleOpen = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => {
      setFetch(userId);
      setOpen(true);
    }, hoverDelay);
  }, [userId, hoverDelay]);

  // Close after a tiny grace period so moving from trigger → card doesn't
  // flicker. 80 ms is enough for the cursor to cross an 8 px gap.
  const scheduleClose = useCallback(() => {
    clearTimer();
    timer.current = setTimeout(() => setOpen(false), 80);
  }, []);

  const cancelClose = useCallback(() => {
    // Called when the cursor enters the card — keep it open
    clearTimer();
  }, []);

  const forceClose = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, []);

  // ── Trigger event handlers ────────────────────────────────────────────────

  const handleTriggerEnter = () => scheduleOpen();
  const handleTriggerLeave = () => scheduleClose();   // starts close grace timer

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { forceClose(); } else { clearTimer(); setFetch(userId); setOpen(true); }
  };

  // ── Global dismiss: Escape + click outside ────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') forceClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, forceClose]);

  useEffect(() => {
    if (!open) return;
    let handler: ((e: MouseEvent) => void) | null = null;
    const id = setTimeout(() => {
      handler = (e: MouseEvent) => {
        const t = e.target as Node;
        if (!triggerRef.current?.contains(t) && !cardRef.current?.contains(t)) {
          forceClose();
        }
      };
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(id);
      if (handler) document.removeEventListener('mousedown', handler);
    };
  }, [open, forceClose]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        onClick={handleClick}
        style={{ display: 'inline-block', lineHeight: 0 }}
      >
        {children}
      </span>

      {open && createPortal(
        <div
          ref={cardRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          // Cursor entered the card — cancel any pending close
          onMouseEnter={cancelClose}
          // Cursor left the card entirely — close immediately
          onMouseLeave={forceClose}
        >
          <UserProfileCard
            data={data}
            isLoading={isLoading}
            error={error}
            {...(profileHref != null ? { profileHref } : {})}
          >
            {cardChildren}
          </UserProfileCard>
        </div>,
        document.body,
      )}
    </>
  );
}

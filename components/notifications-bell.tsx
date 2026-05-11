'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getMyNotificationsAction,
  markNotificationReadAction,
  markAllReadAction,
  type NotificationRow,
} from '@/app/actions/notifications';

const POLL_INTERVAL_MS = 30_000;

function formatRelative(iso: string, nowMs: number): string {
  const diffMs = nowMs - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function NotificationsBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const loadNotifications = useCallback(() => {
    getMyNotificationsAction(10).then((result) => {
      if (!mountedRef.current) return;
      setItems(result.items);
      setUnreadCount(result.unread_count);
      setNowMs(new Date().getTime());
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadNotifications();
    intervalRef.current = setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadNotifications]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) loadNotifications();
  };

  const handleItemClick = (item: NotificationRow) => {
    startTransition(async () => {
      if (!item.read_at) {
        await markNotificationReadAction(item.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)),
        );
      }
      if (item.link_to) {
        setOpen(false);
        router.push(item.link_to);
      }
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllReadAction();
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
      setUnreadCount(0);
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label="알림"
          data-testid="notifications-bell"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white"
              data-testid="notifications-unread-badge"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>알림</span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="text-xs font-normal text-blue-500 hover:underline disabled:opacity-50"
            >
              모두 읽음
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-zinc-400">알림이 없습니다</div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex cursor-pointer flex-col items-start gap-0.5 px-3 py-2.5"
              onSelect={() => handleItemClick(item)}
              data-testid="notification-item"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span
                  className={`text-sm leading-snug font-medium ${item.read_at ? 'text-zinc-500' : 'text-zinc-900'}`}
                >
                  {!item.read_at && (
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle" />
                  )}
                  {item.title}
                </span>
                <span className="shrink-0 text-[11px] text-zinc-400">
                  {nowMs > 0 ? formatRelative(item.created_at, nowMs) : ''}
                </span>
              </div>
              {item.body && <span className="text-xs leading-snug text-zinc-400">{item.body}</span>}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

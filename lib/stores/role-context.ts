'use client';

import { create } from 'zustand';
import type { Role } from '@/lib/auth/guards';

type RoleContextState = {
  currentRoleView: Role | null;
  setRoleView: (role: Role | null) => void;
};

/**
 * 역할 스위처 클라이언트 상태.
 * 헤더에서 seller+agent 겸임 사용자의 현재 컨텍스트를 토글.
 * 초기값은 서버에서 전달받은 기본 role 을 sync 하는 훅을 별도로 둘 예정 (Phase 2).
 */
export const useRoleContext = create<RoleContextState>((set) => ({
  currentRoleView: null,
  setRoleView: (role) => set({ currentRoleView: role }),
}));

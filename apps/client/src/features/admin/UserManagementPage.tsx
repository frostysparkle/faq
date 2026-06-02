// User Management — admin-only page for managing portal users.
import { useState, useRef, useEffect } from 'react';
import {
  Search, Users, GraduationCap, Shield, ChevronDown,
  ChevronLeft, ChevronRight, MoreVertical, ChevronUp,
} from 'lucide-react';
import type { UserRole } from '@samagama/shared';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useUsers, useChangeRole, useSuspendUser, useActivateUser } from './queries';

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | 'active' | 'suspended';
type SortField = 'name' | 'createdAt';
type SortDir = 'asc' | 'desc';

const C = {
  border: '#e5e7eb',
  bg: '#fff',
  surface: '#f9fafb',
  text: '#111827',
  muted: '#6b7280',
  primary: '#6366f1',
  primaryBg: '#eff0fe',
  adminBg: '#fef2f2',
  adminText: '#dc2626',
  adminBorder: '#fecaca',
  modBg: '#fff7ed',
  modText: '#ea580c',
  modBorder: '#fed7aa',
  stuBg: '#eff6ff',
  stuText: '#2563eb',
  stuBorder: '#bfdbfe',
  activeDot: '#16a34a',
  suspDot: '#dc2626',
};

const AVATAR_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6',
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function UserManagementPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const params = {
    page,
    pageSize,
    ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(search ? { q: search } : {}),
  };

  const { data, isLoading } = useUsers(params);
  const changeRole = useChangeRole();
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();

  const totalPages = data?.meta?.totalPages ?? 1;
  const total = data?.meta?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  }

  const GRID = '48px 1fr 1.4fr 140px 110px 130px 120px';

  return (
    <div>
      <SectionHeader title="User Management" sub="Manage portal users — roles and access." />

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12,
          padding: '9px 16px', flex: '1 1 240px', maxWidth: 340,
          boxShadow: '0 1px 3px rgba(0,0,0,.04)',
        }}>
          <Search size={15} color={C.muted} style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: C.text, fontFamily: 'inherit', width: '100%' }}
          />
        </div>

        {/* Role chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          <RoleChip label="All Roles" icon={<Users size={13} />} active={roleFilter === 'all'} onClick={() => { setRoleFilter('all'); setPage(1); }} />
          <RoleChip label="Student" icon={<GraduationCap size={13} />} active={roleFilter === 'student'} onClick={() => { setRoleFilter('student'); setPage(1); }} />
          <RoleChip label="Moderator" icon={<Shield size={13} />} active={roleFilter === 'moderator'} onClick={() => { setRoleFilter('moderator'); setPage(1); }} />
          <RoleChip label="Admin" icon={<Shield size={13} />} active={roleFilter === 'admin'} onClick={() => { setRoleFilter('admin'); setPage(1); }} />
        </div>

        {/* Status chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          <StatusChip label="All Status" dot={null} active={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); setPage(1); }} />
          <StatusChip label="Active" dot={C.activeDot} active={statusFilter === 'active'} onClick={() => { setStatusFilter('active'); setPage(1); }} />
          <StatusChip label="Suspended" dot={C.suspDot} active={statusFilter === 'suspended'} onClick={() => { setStatusFilter('suspended'); setPage(1); }} />
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '11px 20px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
          {['#', null, null, null, null, null, null].map((_, i) => {
            const labels: (string | null)[] = ['#', 'NAME', 'EMAIL', 'ROLE', 'STATUS', 'JOINED', 'ACTIONS'];
            const sortable: (SortField | null)[] = [null, 'name', null, null, null, 'createdAt', null];
            const sf = sortable[i];
            const label = labels[i];
            return (
              <div
                key={i}
                onClick={sf ? () => toggleSort(sf) : undefined}
                style={{
                  fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.6px',
                  display: 'flex', alignItems: 'center', gap: 4,
                  cursor: sf ? 'pointer' : 'default', userSelect: 'none',
                }}
              >
                {label}
                {sf && (
                  sortField === sf
                    ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
                    : <ChevronDown size={11} style={{ opacity: 0.35 }} />
                )}
              </div>
            );
          })}
        </div>

        {isLoading && <div style={{ padding: '24px 20px', fontSize: 13, color: C.muted }}>Loading…</div>}

        {!isLoading && (data?.items.length ?? 0) === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: C.muted }}>
            No users match the current filters.
          </div>
        )}

        <div ref={menuRef}>
          {data?.items.map((user, i) => {
            const rowNum = String((page - 1) * pageSize + i + 1).padStart(2, '0');
            const bg = avatarColor(user.name);
            const isMenuOpen = openMenu === user.id;

            return (
              <div
                key={user.id}
                style={{
                  display: 'grid', gridTemplateColumns: GRID,
                  padding: '13px 20px', alignItems: 'center',
                  borderBottom: i < (data.items.length - 1) ? `1px solid ${C.border}` : 'none',
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                {/* # badge */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 8,
                    background: C.primaryBg, color: C.primary,
                    fontSize: 11, fontWeight: 700, letterSpacing: '.3px',
                  }}>
                    {rowNum}
                  </span>
                </div>

                {/* Name + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
                  }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </span>
                </div>

                {/* Email */}
                <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>

                {/* Role badge */}
                <div>
                  <RoleBadge role={user.role} />
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: user.status === 'active' ? C.activeDot : C.suspDot,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: user.status === 'active' ? C.activeDot : C.suspDot }}>
                    {user.status === 'active' ? 'Active' : 'Suspended'}
                  </span>
                </div>

                {/* Joined */}
                <div style={{ fontSize: 12, color: C.muted }}>{fmtDate(user.createdAt)}</div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                  {/* Role select styled as dropdown */}
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <select
                      value={user.role}
                      onChange={(e) => changeRole.mutate({ userId: user.id, role: e.target.value })}
                      style={{
                        appearance: 'none', WebkitAppearance: 'none',
                        fontSize: 12, fontWeight: 500,
                        padding: '5px 28px 5px 10px',
                        borderRadius: 8, border: `1.5px solid ${C.border}`,
                        background: C.surface, color: C.text,
                        fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                      }}
                    >
                      <option value="student">Student</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown size={12} color={C.muted} style={{ position: 'absolute', right: 8, pointerEvents: 'none' }} />
                  </div>

                  {/* 3-dot menu */}
                  <div style={{ position: 'relative' }}>
                    <button
                      aria-label="User actions"
                      data-tooltip="User actions"
                      onClick={() => setOpenMenu(isMenuOpen ? null : user.id)}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${C.border}`,
                        background: isMenuOpen ? C.primaryBg : C.bg,
                        color: isMenuOpen ? C.primary : C.muted,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <MoreVertical size={14} />
                    </button>

                    {isMenuOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: 36, zIndex: 20,
                        background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,.1)', minWidth: 148, overflow: 'hidden',
                      }}>
                        {user.status === 'active' ? (
                          <MenuAction
                            label="Suspend user"
                            color="#dc2626"
                            onClick={() => { suspendUser.mutate(user.id); setOpenMenu(null); }}
                          />
                        ) : (
                          <MenuAction
                            label="Activate user"
                            color="#16a34a"
                            onClick={() => { activateUser.mutate(user.id); setOpenMenu(null); }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', borderTop: `1px solid ${C.border}`, background: C.surface,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.muted }}>
            <Users size={14} />
            Showing <strong style={{ color: C.text }}>{from}</strong> to <strong style={{ color: C.text }}>{to}</strong> of <strong style={{ color: C.text }}>{total}</strong> users
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Page size picker */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  fontSize: 12, fontWeight: 500,
                  padding: '5px 28px 5px 10px', borderRadius: 8,
                  border: `1.5px solid ${C.border}`, background: C.bg,
                  color: C.text, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                }}
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} per page</option>
                ))}
              </select>
              <ChevronDown size={12} color={C.muted} style={{ position: 'absolute', right: 8, pointerEvents: 'none' }} />
            </div>

            {/* Page buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={14} />
              </PageBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '...'
                    ? <span key={`e${i}`} style={{ fontSize: 12, color: C.muted, padding: '0 4px' }}>…</span>
                    : <PageBtn key={p} active={p === page} onClick={() => setPage(p as number)}>{p}</PageBtn>
                )}
              <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight size={14} />
              </PageBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg =
    role === 'admin'
      ? { bg: C.adminBg, color: C.adminText, border: C.adminBorder, icon: <Shield size={11} />, label: 'Admin' }
      : role === 'moderator'
      ? { bg: C.modBg, color: C.modText, border: C.modBorder, icon: <Shield size={11} />, label: 'Moderator' }
      : { bg: C.stuBg, color: C.stuText, border: C.stuBorder, icon: <GraduationCap size={11} />, label: 'Student' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
    }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function RoleChip({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 500, padding: '6px 13px', borderRadius: 20,
        border: `1.5px solid ${active ? C.primary : C.border}`,
        background: active ? C.primary : C.bg,
        color: active ? '#fff' : C.muted,
        cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
        transition: 'all .1s',
      }}
    >
      {icon}{label}
    </button>
  );
}

function StatusChip({ label, dot, active, onClick }: { label: string; dot: string | null; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 500, padding: '6px 13px', borderRadius: 20,
        border: `1.5px solid ${active ? C.primary : C.border}`,
        background: active ? C.primary : C.bg,
        color: active ? '#fff' : C.muted,
        cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
        transition: 'all .1s',
      }}
    >
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? '#fff' : dot, flexShrink: 0 }} />}
      {label}
    </button>
  );
}

function PageBtn({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 30, height: 30, borderRadius: 7, border: `1.5px solid ${active ? C.primary : C.border}`,
        background: active ? C.primary : C.bg,
        color: active ? '#fff' : disabled ? '#d1d5db' : C.muted,
        fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function MenuAction({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '10px 14px', border: 'none', background: 'none',
        textAlign: 'left', fontSize: 12, fontWeight: 500, color,
        cursor: 'pointer', fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
    >
      {label}
    </button>
  );
}

// User Management — admin-only page for managing portal users.
// Features: paginated table, role/status filters, search, role change, suspend/activate.
import { useState } from 'react';
import { Shield, UserX, UserCheck, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserRole } from '@samagama/shared';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useUsers, useChangeRole, useSuspendUser, useActivateUser } from './queries';

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | 'active' | 'suspended';

export function UserManagementPage() {
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const params = {
    page,
    pageSize: 15,
    ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(search ? { q: search } : {}),
  };

  const { data, isLoading } = useUsers(params);
  const changeRole = useChangeRole();
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div>
      <SectionHeader title="User Management" sub="Manage portal users — roles and access." />

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--color-input)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '6px 12px',
            flex: '1 1 220px',
            maxWidth: 320,
          }}
        >
          <Search size={14} color="var(--color-text-muted)" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…"
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 13,
              color: 'var(--color-text)',
              fontFamily: 'inherit',
              width: '100%',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'student', 'moderator', 'admin'] as RoleFilter[]).map((r) => (
            <FilterChip key={r} active={roleFilter === r} onClick={() => { setRoleFilter(r); setPage(1); }}>
              {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
            </FilterChip>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'suspended'] as StatusFilter[]).map((s) => (
            <FilterChip key={s} active={statusFilter === s} onClick={() => { setStatusFilter(s); setPage(1); }}>
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr 1fr 140px',
            gap: 10,
            padding: '10px 18px',
            background: 'var(--color-input)',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '.5px',
          }}
        >
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Joined</div>
          <div>Actions</div>
        </div>

        {isLoading && <div style={{ padding: 18, fontSize: 13 }}>Loading…</div>}
        {!isLoading && (data?.items.length ?? 0) === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
            No users match the current filters.
          </div>
        )}

        {data?.items.map((user, i) => (
          <div
            key={user.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 0.8fr 0.8fr 1fr 140px',
              gap: 10,
              padding: '12px 18px',
              borderBottom: i < (data.items.length - 1) ? '1px solid var(--color-border)' : 'none',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{user.email}</div>
            <div>
              <Badge color={roleColor(user.role)}>{user.role}</Badge>
            </div>
            <div>
              <Badge color={user.status === 'active' ? 'success' : 'danger'}>{user.status}</Badge>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={user.role}
                onChange={(e) => changeRole.mutate({ userId: user.id, role: e.target.value })}
                style={{
                  fontSize: 11,
                  padding: '3px 6px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-input)',
                  color: 'var(--color-text)',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option value="student">Student</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              {user.status === 'active' ? (
                <button
                  onClick={() => suspendUser.mutate(user.id)}
                  title="Suspend user"
                  style={{
                    background: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <UserX size={12} />
                </button>
              ) : (
                <button
                  onClick={() => activateUser.mutate(user.id)}
                  title="Activate user"
                  style={{
                    background: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <UserCheck size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginTop: 16,
          }}
        >
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={14} /> Prev
          </Button>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: '5px 12px',
        borderRadius: 20,
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary)' : 'var(--color-card)',
        color: active ? 'white' : 'var(--color-text-muted)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

function roleColor(role: string): 'accent' | 'warning' | 'danger' | 'default' {
  switch (role) {
    case 'admin': return 'danger';
    case 'moderator': return 'warning';
    case 'student': return 'accent';
    default: return 'default';
  }
}
